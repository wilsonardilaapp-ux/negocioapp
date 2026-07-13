'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import { loyaltyService, type LoyaltyTransaction, type Reward, type LoyaltyBalance } from '@/services/loyalty-service';
import { normalizePhoneNumber } from '@/lib/utils';
import { revalidatePath } from 'next/cache';
import type { AdminNotification } from '@/models/notification';
import type { Business } from '@/models/business';
import { FieldValue, type Transaction, type Firestore, Timestamp } from 'firebase-admin/firestore';
import { handleChurnRecovery } from '@/services/recovery-service';
import type { Order } from '@/models/order';

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
 * Obtiene el ranking de clientes con más visitas para el panel administrativo.
 */
export async function getVipRanking(businessId: string): Promise<LoyaltyBalance[]> {
  try {
    return await loyaltyService.getTopLoyaltyCustomers(businessId);
  } catch (error) {
    console.error('[Action: getVipRanking] Error:', error);
    return [];
  }
}

/**
 * Obtiene estadísticas de Churn (abandono) para el panel administrativo.
 * Utiliza el umbral dinámico configurado en el negocio.
 */
export async function getChurnStatistics(businessId: string) {
  if (!businessId) return { customers: [], totalCount: 0, threshold: 30 };

  try {
    const db = await getAdminFirestore();
    const businessSnap = await db.collection('businesses').doc(businessId).get();
    
    let threshold = 30; // Fallback por defecto
    
    if (businessSnap.exists) {
      const data = businessSnap.data() as Business;
      threshold = data.loyaltyConfig?.churnDaysThreshold ?? 30;
    }

    const stats = await loyaltyService.getChurnRiskCustomers(businessId, threshold);
    
    return {
      ...stats,
      threshold
    };
  } catch (error) {
    console.error('[Action: getChurnStatistics] Error:', error);
    return { customers: [], totalCount: 0, threshold: 30 };
  }
}

/**
 * Recupera de forma masiva a los clientes en riesgo de abandono.
 * Limita a 10 clientes por tanda por seguridad de la API y IA.
 */
export async function bulkRecoverChurnClients(businessId: string) {
  if (!businessId) return { success: false, error: 'ID de negocio no proporcionado.' };

  try {
    const { customers } = await getChurnStatistics(businessId);
    
    // Seguridad: limitar a los 10 más antiguos en esta versión para evitar spam masivo
    const toRecover = customers.slice(0, 10);
    
    if (toRecover.length === 0) {
      return { success: true, count: 0, message: 'No hay clientes que cumplan los criterios de abandono.' };
    }

    const recoveryPromises = toRecover.map(async (client) => {
      // Calcular días inactivos para el prompt de la IA
      const lastVisitAtDate = client.lastVisitAt ? new Date(client.lastVisitAt) : new Date();
      const diffTime = Math.abs(Date.now() - lastVisitAtDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return handleChurnRecovery({
        businessId,
        name: client.name || 'Cliente',
        whatsapp: client.whatsapp,
        daysInactive: diffDays
      });
    });

    // Ejecutamos los procesos de IA y WHAPI en paralelo
    await Promise.all(recoveryPromises);

    return { 
      success: true, 
      count: toRecover.length 
    };
  } catch (error: any) {
    console.error('[Action: bulkRecoverChurnClients] Error:', error.message);
    return { success: false, error: error.message };
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
 * También gestiona la ATRIBUCIÓN ROI (Fase 4.1) si el pedido viene de una recuperación.
 */
export async function awardLoyaltyPoints(
  businessId: string, 
  whatsapp: string, 
  orderId: string, 
  totalPago: number,
  overrideDate?: string
): Promise<{ success: boolean; error?: string; pointsAwarded?: number }> {
  const db = await getAdminFirestore();
  const cleanWhatsapp = normalizePhoneNumber(whatsapp);
  
  // --- 1. LÓGICA DE ATRIBUCIÓN (Fase 4.1) ---
  // Buscamos si el cliente recibió un mensaje de recuperación en los últimos 7 días
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thresholdDate = Timestamp.fromDate(sevenDaysAgo);

  let recoveryMessageId: string | null = null;
  
  try {
    const recoverySnap = await db.collection('whatsapp_scheduled')
      .where('businessId', '==', businessId)
      .where('whatsapp', '==', cleanWhatsapp)
      .where('status', '==', 'sent')
      .where('createdAt', '>=', thresholdDate)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    recoveryMessageId = !recoverySnap.empty ? recoverySnap.docs[0].id : null;
  } catch (e: any) {
    // Si falla por falta de índice compuesto, logueamos aviso pero permitimos continuar
    console.warn(`[ROI Attribution Warn] No se pudo consultar la atribución ROI para ${orderId}: ${e.message}. El sistema continuará otorgando los puntos.`);
  }

  const balanceRef = db.collection('businesses').doc(businessId).collection('loyaltyBalances').doc(cleanWhatsapp);
  const txLogRef = db.collection('businesses').doc(businessId).collection('loyaltyTransactions').doc(`earn_${orderId}`);
  const businessRef = db.collection('businesses').doc(businessId);
  const orderRef = db.collection('businesses').doc(businessId).collection('orders').doc(orderId);

  try {
    const result = await db.runTransaction(async (transaction) => {
      // 2. LECTURAS TRANSACCIONALES (IDEMPOTENCIA + CONFIG + BALANCE)
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
      const visitDate = overrideDate ? Timestamp.fromDate(new Date(overrideDate)) : FieldValue.serverTimestamp();

      // 3. ESCRITURAS TRANSACCIONALES
      
      // A. ATRIBUCIÓN ROI: Marcar pedido como recuperado si aplica
      if (recoveryMessageId) {
        transaction.update(orderRef, {
            isRecovered: true,
            recoverySourceId: recoveryMessageId,
            recoveredAt: nowISO
        });
      }

      // B. Actualizar Balance sumando puntos, incrementando visitas y registrando fecha
      transaction.set(balanceRef, {
        whatsapp: cleanWhatsapp,
        points: newPoints,
        visitCount: FieldValue.increment(1),
        lastVisitAt: visitDate,
        updatedAt: nowISO
      }, { merge: true });

      // C. Registrar Log de Transacción (Sirve de ancla para la idempotencia)
      const logData = {
        id: txLogRef.id,
        whatsapp: cleanWhatsapp,
        type: 'earn',
        amount: pointsToAward,
        reason: `Puntos por compra (Pedido #${orderId.slice(-8).toUpperCase()})`,
        orderId: orderId,
        createdAt: overrideDate ? overrideDate : nowISO
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
 * Sincroniza masivamente el historial de pedidos de un negocio para otorgar puntos pendientes.
 * Procesa únicamente pedidos con estado 'Entregado' que no tengan transacciones previas.
 * Implementa resiliencia ante datos inválidos e índices faltantes.
 */
export async function syncBusinessLoyaltyHistory(businessId: string) {
  if (!businessId) return { success: false, error: 'ID de negocio no proporcionado.' };

  const db = await getAdminFirestore();
  const summary = {
    processed: 0,
    alreadySynced: 0,
    skippedInvalidData: 0, // Pedidos sin teléfono (Fase 17.1)
    errors: 0,
    totalPointsAwarded: 0
  };

  try {
    // 1. Validación de Configuración (Fase 17.1)
    const businessSnap = await db.collection('businesses').doc(businessId).get();
    const bData = businessSnap.data() as Business;
    if (!bData?.loyaltyConfig?.amountThreshold || bData.loyaltyConfig.amountThreshold <= 0) {
      return { success: false, error: 'Debe configurar el valor de los puntos (Umbral de Consumo) antes de sincronizar.' };
    }

    // 2. Obtener todos los pedidos entregados del negocio
    const ordersSnap = await db.collection('businesses')
      .doc(businessId)
      .collection('orders')
      .where('orderStatus', '==', 'Entregado')
      .get();

    if (ordersSnap.empty) {
      return { success: true, summary, message: "No se encontraron pedidos entregados para sincronizar." };
    }

    // 3. Procesamiento secuencial para proteger la estabilidad de Firestore (Max 500 writes/batch)
    for (const orderDoc of ordersSnap.docs) {
      const order = orderDoc.data() as Order;
      const orderId = orderDoc.id;
      
      // Sanitización (Fase 17.1): Ignorar pedidos sin teléfono sin contar como error crítico
      if (!order.customerPhone) {
        summary.skippedInvalidData++;
        continue;
      }

      try {
        // La función awardLoyaltyPoints ya es resiliente (atribución ROI opcional) e idempotente
        const result = await awardLoyaltyPoints(
          businessId,
          order.customerPhone,
          orderId,
          order.total || order.subtotal || 0,
          order.orderDate // Pasamos la fecha original para el lastVisitAt
        );

        if (result.success) {
          if (result.pointsAwarded && result.pointsAwarded > 0) {
            summary.processed++;
            summary.totalPointsAwarded += result.pointsAwarded;
          } else {
            summary.alreadySynced++;
          }
        } else {
          // Si el error es manejable, aumentamos contador pero seguimos
          summary.errors++;
        }
      } catch (e) {
        console.error(`[LoyaltySync] Error en pedido ${orderId}:`, e);
        summary.errors++;
      }
    }

    // 4. Invalidar la caché de las páginas relevantes tras la sincronización masiva
    revalidatePath('/dashboard/loyalty');
    revalidatePath(`/catalog/${businessId}`);

    return { 
      success: true, 
      summary, 
      message: `Sincronización finalizada. ${summary.processed} pedidos procesados retroactivamente.` 
    };

  } catch (error: any) {
    console.error('[Action: syncBusinessLoyaltyHistory] Error Crítico:', error.message);
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

/**
 * Obtiene estadísticas de ingresos recuperados por la IA para el panel administrativo.
 * Atribución basada en la marca 'isRecovered' en los pedidos.
 */
export async function getRecoveryStats(businessId: string) {
    if (!businessId) return { totalRevenue: 0, count: 0, topReason: 'N/A' };

    const db = await getAdminFirestore();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    try {
        // Consultar pedidos recuperados del mes actual
        const ordersSnap = await db.collection('businesses')
            .doc(businessId)
            .collection('orders')
            .where('isRecovered', '==', true)
            .where('orderStatus', '==', 'Entregado')
            .get();

        let totalRevenue = 0;
        let count = 0;
        const reasonCounts: Record<string, number> = {};

        // Filtrado por fecha en memoria para evitar índices complejos innecesarios
        // y agregación de motivos
        for (const orderDoc of ordersSnap.docs) {
            const orderData = orderDoc.data() as Order;
            const orderDate = new Date(orderData.orderDate);
            
            if (orderDate >= startOfMonth) {
                totalRevenue += (orderData.total || orderData.subtotal || 0);
                count++;

                // Identificar el motivo de la recuperación
                if (orderData.recoverySourceId) {
                    const msgSnap = await db.collection('whatsapp_scheduled').doc(orderData.recoverySourceId).get();
                    if (msgSnap.exists) {
                        const reason = msgSnap.data()?.reason || 'unknown';
                        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
                    }
                }
            }
        }

        // Determinar el motivo más efectivo
        let topReason = 'N/A';
        let maxCount = 0;
        for (const [reason, rCount] of Object.entries(reasonCounts)) {
            if (rCount > maxCount) {
                maxCount = rCount;
                topReason = reason === 'churn' ? 'Fidelización' : (reason === 'negative_review' ? 'Atención a Críticas' : reason);
            }
        }

        return {
            totalRevenue,
            count,
            topReason
        };
    } catch (error) {
        console.error('[Action: getRecoveryStats] Error:', error);
        return { totalRevenue: 0, count: 0, topReason: 'Error' };
    }
}
