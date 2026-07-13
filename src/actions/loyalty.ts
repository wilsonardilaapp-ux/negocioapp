'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import { loyaltyService, type LoyaltyTransaction, type Reward } from '@/services/loyalty-service';
import { normalizePhoneNumber } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import type { AdminNotification } from '@/models/notification';
import type { Business } from '@/models/business';
import { FieldValue, type Transaction, type Firestore } from 'firebase-admin/firestore';

export interface LoyaltyStatusResponse {
  success: boolean;
  balance: number;
  catalog: Reward[];
  history: LoyaltyTransaction[];
  error?: string;
}

/**
 * Obtiene el estado completo de fidelización de un cliente en una sola llamada.
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
 * Requisito: invoiceCode verificado antes de la transacción.
 */
export async function redeemReward(
  businessId: string, 
  whatsapp: string, 
  rewardId: string,
  invoiceCode: string
): Promise<{ success: boolean; error?: string; newBalance?: number }> {
  const db = await getAdminFirestore();
  const cleanWhatsapp = normalizePhoneNumber(whatsapp);
  
  // 1. VALIDACIÓN EXTERNA (Fuera de la transacción para optimizar reintentos)
  const isValid = await loyaltyService.verifyInvoiceCode(businessId, whatsapp, invoiceCode);
  if (!isValid) return { success: false, error: 'Validación de seguridad fallida. Código de factura no válido.' };

  const balanceRef = db.collection('businesses').doc(businessId).collection('loyaltyBalances').doc(cleanWhatsapp);
  const rewardRef = db.collection('businesses').doc(businessId).collection('rewards').doc(rewardId);
  const transactionCol = db.collection('businesses').doc(businessId).collection('loyaltyTransactions');

  try {
    const result = await db.runTransaction(async (transaction) => {
      // 2. LECTURAS TRANSACCIONALES (Siempre primero)
      const [balanceSnap, rewardSnap] = await Promise.all([
        transaction.get(balanceRef),
        transaction.get(rewardRef)
      ]);

      if (!rewardSnap.exists) throw new Error('El premio ya no está disponible en el catálogo.');
      
      const currentBalance = balanceSnap.exists ? (balanceSnap.data()?.points || 0) : 0;
      const reward = rewardSnap.data() as Reward;

      if (currentBalance < reward.pointsCost) {
        throw new Error(`INSUFFICIENT_POINTS|Saldo insuficiente. Tienes ${currentBalance} puntos y necesitas ${reward.pointsCost}.`);
      }

      const newBalance = currentBalance - reward.pointsCost;
      const now = new Date().toISOString();

      // 3. ESCRITURAS TRANSACCIONALES
      transaction.set(balanceRef, {
        whatsapp: cleanWhatsapp,
        points: newBalance,
        updatedAt: now
      }, { merge: true });

      const logRef = transactionCol.doc();
      const logData = {
        whatsapp: cleanWhatsapp,
        type: 'redeem',
        amount: -reward.pointsCost,
        reason: `Canje de premio: ${reward.name}`,
        createdAt: now
      };
      transaction.set(logRef, logData);

      return { newBalance, rewardName: reward.name };
    });

    // 4. POST-PROCESAMIENTO (Notificación al negocio)
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
    return { success: false, error: 'Ocurrió un error al procesar el canje.' };
  }
}

/**
 * Otorga puntos de fidelidad por consumo tras la facturación de un pedido.
 * Implementa contador de visitas e idempotencia basada en el ID del pedido.
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

      // Guard 1: Idempotencia (¿Ya se otorgaron puntos/visitas para este pedido?)
      if (txSnap.exists) return { pointsAwarded: 0 }; 

      // Guard 2: Configuración (¿Umbral válido?)
      const business = businessSnap.data() as Business;
      const loyaltyConfig = business.loyaltyConfig;

      if (!loyaltyConfig?.amountThreshold || loyaltyConfig.amountThreshold <= 0) {
        return { pointsAwarded: 0 };
      }

      const pointsToAward = Math.floor(totalPago / loyaltyConfig.amountThreshold);
      if (pointsToAward <= 0) return { pointsAwarded: 0 };

      const currentPoints = balanceSnap.exists ? (balanceSnap.data()?.points || 0) : 0;
      const newPoints = currentPoints + pointsToAward;
      const nowISO = new Date().toISOString();

      // 2. ESCRITURAS TRANSACCIONALES
      
      // Actualizar Balance sumando puntos, incrementando visitas y registrando fecha
      transaction.set(balanceRef, {
        whatsapp: cleanWhatsapp,
        points: newPoints,
        visitCount: FieldValue.increment(1),
        lastVisitAt: FieldValue.serverTimestamp(),
        updatedAt: nowISO
      }, { merge: true });

      // Registrar Log de Transacción (Sirve de ancla para la idempotencia)
      const logData = {
        id: txLogRef.id,
        whatsapp: cleanWhatsapp,
        type: 'earn',
        amount: pointsToAward,
        reason: `Puntos por compra (Pedido #${orderId.slice(-8).toUpperCase()})`,
        orderId: orderId,
        createdAt: nowISO
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

/**
 * Función interna reutilizable para otorgar puntos de forma transaccional.
 * Garantiza la idempotencia mediante el transactionId proporcionado.
 * DEBE ser invocada al inicio del bloque runTransaction para cumplir la regla "Read before Write".
 */
export async function grantLoyaltyPointsTransactional(
  transaction: Transaction,
  db: Firestore,
  businessId: string,
  whatsapp: string,
  amount: number,
  reason: string,
  transactionId: string
) {
  const cleanWhatsapp = normalizePhoneNumber(whatsapp);
  const balanceRef = db.collection('businesses').doc(businessId).collection('loyaltyBalances').doc(cleanWhatsapp);
  const txLogRef = db.collection('businesses').doc(businessId).collection('loyaltyTransactions').doc(transactionId);

  // LECTURAS (Siempre al inicio de la transacción)
  const [txSnap, balanceSnap] = await Promise.all([
    transaction.get(txLogRef),
    transaction.get(balanceRef)
  ]);

  if (txSnap.exists) return;

  const currentPoints = balanceSnap.exists ? (balanceSnap.data()?.points || 0) : 0;
  const newPoints = currentPoints + amount;
  const now = new Date().toISOString();

  // ESCRITURAS
  transaction.set(balanceRef, {
    whatsapp: cleanWhatsapp,
    points: newPoints,
    updatedAt: now
  }, { merge: true });

  transaction.set(txLogRef, {
    id: transactionId,
    whatsapp: cleanWhatsapp,
    type: 'earn',
    amount: amount,
    reason: reason,
    createdAt: now
  });
}
