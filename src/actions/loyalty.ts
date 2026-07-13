'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import { loyaltyService, type LoyaltyTransaction, type Reward } from '@/services/loyalty-service';
import { normalizePhoneNumber } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import type { AdminNotification } from '@/models/notification';
import type { Business } from '@/models/business';

export interface LoyaltyStatusResponse {
  success: boolean;
  balance: number;
  catalog: Reward[];
  history: LoyaltyTransaction[];
  error?: string;
}

/**
 * Obtiene el estado completo de fidelización de un cliente en una sola llamada.
 * Valida la identidad mediante el código de factura antes de devolver datos sensibles.
 */
export async function getLoyaltyStatus(
  businessId: string, 
  whatsapp: string, 
  invoiceCode: string
): Promise<LoyaltyStatusResponse> {
  try {
    const isValid = await loyaltyService.verifyInvoiceCode(businessId, whatsapp, invoiceCode);
    
    if (!isValid) {
      return { success: false, balance: 0, catalog: [], history: [], error: 'Código de factura o teléfono no válidos para este negocio.' };
    }

    const [balance, catalog, history] = await Promise.all([
      loyaltyService.getLoyaltyBalanceRaw(businessId, whatsapp),
      loyaltyService.getActiveRewardsCatalog(businessId),
      loyaltyService.getLoyaltyTransactionHistory(businessId, whatsapp)
    ]);

    return {
      success: true,
      balance,
      catalog,
      history
    };
  } catch (error: any) {
    console.error('[Action: getLoyaltyStatus] Error:', error.message);
    return { success: false, balance: 0, catalog: [], history: [], error: 'Error interno del servidor.' };
  }
}

/**
 * Procesa el canje de un premio restando puntos en una transacción atómica.
 * La validación de seguridad ocurre fuera de la transacción para optimizar recursos.
 */
export async function redeemReward(
  businessId: string, 
  whatsapp: string, 
  rewardId: string,
  invoiceCode: string
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  const db = await getAdminFirestore();
  const cleanWhatsapp = normalizePhoneNumber(whatsapp);
  
  // 1. VALIDACIÓN DE SEGURIDAD (Fuera de la transacción para evitar re-ejecución pesada)
  const isValid = await loyaltyService.verifyInvoiceCode(businessId, whatsapp, invoiceCode);
  if (!isValid) return { success: false, error: 'Validación de seguridad fallida. Código de factura no válido.' };

  const balanceRef = db.collection('businesses').doc(businessId).collection('loyaltyBalances').doc(cleanWhatsapp);
  const rewardRef = db.collection('businesses').doc(businessId).collection('rewards').doc(rewardId);
  const transactionCol = db.collection('businesses').doc(businessId).collection('loyaltyTransactions');

  try {
    const result = await db.runTransaction(async (transaction) => {
      // 2. LECTURAS TRANSACCIONALES
      const [balanceSnap, rewardSnap] = await Promise.all([
        transaction.get(balanceRef),
        transaction.get(rewardRef)
      ]);

      if (!rewardSnap.exists) throw new Error('El premio ya no está disponible en el catálogo.');
      
      const currentBalance = balanceSnap.exists ? (balanceSnap.data()?.points || 0) : 0;
      const reward = rewardSnap.data() as Reward;

      // 3. VALIDACIÓN DE LÓGICA DE NEGOCIO (Error controlado)
      if (currentBalance < reward.pointsCost) {
        throw new Error(`INSUFFICIENT_POINTS|Saldo insuficiente. Tienes ${currentBalance} puntos y necesitas ${reward.pointsCost}.`);
      }

      const newBalance = currentBalance - reward.pointsCost;
      const now = new Date().toISOString();

      // 4. ESCRITURAS ATÓMICAS
      transaction.set(balanceRef, {
        whatsapp: cleanWhatsapp,
        points: newBalance,
        updatedAt: now
      }, { merge: true });

      const logRef = transactionCol.doc();
      const logData: Omit<LoyaltyTransaction, 'id'> = {
        whatsapp: cleanWhatsapp,
        type: 'redeem',
        amount: -reward.pointsCost,
        reason: `Canje de premio: ${reward.name}`,
        createdAt: now
      };
      transaction.set(logRef, logData);

      return { newBalance, rewardName: reward.name };
    });

    // 5. POST-PROCESAMIENTO (Fuera de la transacción: Notificaciones y Revalidación)
    
    // Notificación al restaurante
    const notificationRef = db.collection(`businesses/${businessId}/notifications`).doc();
    const notificationData: Omit<AdminNotification, 'id'> = {
        fromSuperAdmin: true,
        subject: '🎁 Nuevo canje de premio',
        body: `<p>El cliente con WhatsApp <strong>${whatsapp}</strong> ha canjeado sus puntos por: <strong>${result.rewardName}</strong>.</p><p>Por favor, verifica el código de factura <strong>${invoiceCode}</strong> si es necesario para la entrega.</p>`,
        read: false,
        createdAt: new Date().toISOString(),
        type: 'general',
    };
    await notificationRef.set(notificationData);

    revalidatePath(`/catalog/${businessId}`);
    
    return { success: true, newBalance: result.newBalance };

  } catch (error: any) {
    console.error('[Action: redeemReward] Error:', error.message);
    
    if (error.message.startsWith('INSUFFICIENT_POINTS|')) {
        return { success: false, error: error.message.split('|')[1] };
    }
    
    return { success: false, error: 'Ocurrió un error al procesar el canje. Por favor intente de nuevo.' };
  }
}

/**
 * Otorga puntos de fidelidad por consumo tras la facturación de un pedido.
 * Implementa idempotencia basada en el orderId mediante una transacción atómica.
 */
export async function awardLoyaltyPoints(
  businessId: string, 
  whatsapp: string, 
  orderId: string, 
  totalPago: number
): Promise<{ success: boolean; error?: string; pointsAwarded?: number }> {
  const db = await getAdminFirestore();
  const cleanWhatsapp = normalizePhoneNumber(whatsapp);
  
  const balanceRef = db.collection('businesses').doc(businessId).collection('loyaltyBalances').doc(cleanWhatsapp);
  const txLogRef = db.collection('businesses').doc(businessId).collection('loyaltyTransactions').doc(`earn_${orderId}`);
  const businessRef = db.collection('businesses').doc(businessId);

  try {
    const result = await db.runTransaction(async (transaction) => {
      // 1. LECTURAS TRANSACCIONALES (IDEMPOTENCIA + CONFIG + BALANCE)
      const [txSnap, businessSnap, balanceSnap] = await Promise.all([
        transaction.get(txLogRef),
        transaction.get(businessRef),
        transaction.get(balanceRef)
      ]);

      // Guard 1: Idempotencia (¿Ya se otorgaron puntos para este pedido?)
      if (txSnap.exists) return { pointsAwarded: 0 }; 

      // Guard 2: Configuración (¿Umbral válido?)
      const business = businessSnap.data() as Business;
      const loyaltyConfig = business.loyaltyConfig;

      // El campo 'enabled' se validará cuando exista UI de configuración.
      // Por ahora basta con que el negocio tenga un umbral definido > 0.
      if (!loyaltyConfig?.amountThreshold || loyaltyConfig.amountThreshold <= 0) {
        return { pointsAwarded: 0 };
      }

      // 2. CÁLCULO DE PUNTOS
      const pointsToAward = Math.floor(totalPago / loyaltyConfig.amountThreshold);
      if (pointsToAward <= 0) return { pointsAwarded: 0 };

      const currentPoints = balanceSnap.exists ? (balanceSnap.data()?.points || 0) : 0;
      const newPoints = currentPoints + pointsToAward;
      const now = new Date().toISOString();

      // 3. ESCRITURAS ATÓMICAS
      transaction.set(balanceRef, {
        whatsapp: cleanWhatsapp,
        points: newPoints,
        updatedAt: now
      }, { merge: true });

      const logData: LoyaltyTransaction = {
        id: txLogRef.id,
        whatsapp: cleanWhatsapp,
        type: 'earn',
        amount: pointsToAward,
        reason: `Puntos por compra (Pedido #${orderId.slice(-8).toUpperCase()})`,
        orderId: orderId,
        createdAt: now
      };
      transaction.set(txLogRef, logData);

      return { pointsAwarded: pointsToAward };
    });

    if (result.pointsAwarded && result.pointsAwarded > 0) {
      revalidatePath(`/catalog/${businessId}`);
    }
    
    return { success: true, pointsAwarded: result.pointsAwarded };

  } catch (error: any) {
    console.error('[Action: awardLoyaltyPoints] Error:', error.message);
    return { success: false, error: error.message };
  }
}
