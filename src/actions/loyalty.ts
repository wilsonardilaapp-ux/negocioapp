'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import { loyaltyService, type LoyaltyTransaction, type Reward } from '@/services/loyalty-service';
import { normalizePhoneNumber } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import type { AdminNotification } from '@/models/notification';

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
        // Lanzamos error para abortar la transacción, se captura en el catch externo
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
        type: 'redeem', // Valor estandarizado
        amount: -reward.pointsCost, // Campo estandarizado
        reason: `Canje de premio: ${reward.name}`,
        createdAt: now
      };
      transaction.set(logRef, logData);

      return { newBalance, rewardName: reward.name };
    });

    // 5. POST-PROCESAMIENTO (Fuera de la transacción: Notificaciones y Revalidación)
    
    // Notificación al restaurante (Patrón replicado de directory-ratings)
    const notificationRef = db.collection(`businesses/${businessId}/notifications`).doc();
    const notificationData: any = {
        fromSuperAdmin: true,
        subject: '🎁 Nuevo canje de premio',
        body: `<p>El cliente con WhatsApp <strong>${whatsapp}</strong> ha canjeado sus puntos por: <strong>${result.rewardName}</strong>.</p><p>Por favor, verifica el código de factura <strong>${invoiceCode}</strong> si es necesario para la entrega.</p>`,
        read: false,
        createdAt: new Date().toISOString(),
        type: 'promotion',
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
