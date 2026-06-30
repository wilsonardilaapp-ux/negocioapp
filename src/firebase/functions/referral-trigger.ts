/**
 * @fileOverview Lógica del trigger para activación de recompensas de referidos.
 * Esta lógica está diseñada para ejecutarse como una Cloud Function (Node.js).
 * 
 * En este entorno de prototipado, se define la función de servidor que procesa
 * el cambio de estado de suscripción y otorga las recompensas correspondientes.
 */

import { getAdminFirestore } from '../server-init';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { Referral } from '../../models/referral';
import type { AffiliateConfig } from '../../models/affiliate-config';
import type { ExtraCapacityLog } from '../../models/extra-capacity-log';

/**
 * Función que procesa el otorgamiento de recompensas cuando una suscripción pasa a 'active'.
 * Se dispara mediante un trigger onWrite en businesses/{businessId}/subscription/current.
 */
export async function onSubscriptionActivated(businessId: string, subscriptionData: any) {
  // Solo actuamos si el estado es 'active'
  if (!subscriptionData || subscriptionData.status !== 'active') {
    return null;
  }

  const db = await getAdminFirestore();

  try {
    // 1. Buscar un referral pendiente donde el negocio actual sea el referido (referree)
    const referralsRef = db.collection('referrals');
    const referralQuery = await referralsRef
      .where('referreeBusinessId', '==', businessId)
      .where('status', '==', 'pending_payment')
      .limit(1)
      .get();

    // Si no existe un referido pendiente para este negocio, no hay nada que procesar
    if (referralQuery.empty) {
      console.log(`[ReferralTrigger] No hay referido pendiente para el negocio ${businessId}.`);
      return null;
    }

    const referralDoc = referralQuery.docs[0];

    // 2. Ejecutar el otorgamiento en una transacción atómica para evitar duplicidad
    await db.runTransaction(async (transaction) => {
      // Re-leer el documento de referido dentro de la transacción para asegurar integridad
      const freshReferralSnap = await transaction.get(referralDoc.ref);
      const freshReferral = freshReferralSnap.data() as Referral;

      // GUARDIA CRÍTICA: Verificar que no haya sido procesado ya (doble trigger prevention)
      // Se validan ambos flags de recompensa y el estado del documento.
      if (
        freshReferral.status !== 'pending_payment' || 
        freshReferral.referentRewardGranted || 
        freshReferral.referreeRewardGranted
      ) {
        throw new Error('El referido ya ha sido procesado o no está en estado pendiente de pago.');
      }

      // Leer la configuración global de afiliados
      const configRef = db.doc('adminConfig/affiliates');
      const configSnap = await transaction.get(configRef);
      if (!configSnap.exists) {
        throw new Error('Configuración de afiliados no encontrada en /adminConfig/affiliates.');
      }
      const config = configSnap.data() as AffiliateConfig;

      const referentId = freshReferral.referentBusinessId;
      const referreeId = freshReferral.referreeBusinessId;

      // Obtener los documentos de negocio para extraer sus nombres (para los logs)
      const referentRef = db.doc(`businesses/${referentId}`);
      const referreeRef = db.doc(`businesses/${referreeId}`);
      
      const [referentSnap, referreeSnap] = await Promise.all([
        transaction.get(referentRef),
        transaction.get(referreeRef)
      ]);

      const referentName = referentSnap.data()?.name || 'Negocio Referente';
      const referreeName = referreeSnap.data()?.name || 'Negocio Referido';

      // Verificar si el referente ha alcanzado su tope máximo de recompensas
      let grantToReferent = true;
      if (config.maxReferralsPerUser !== null) {
        const confirmedCountSnap = await db.collection('referrals')
          .where('referentBusinessId', '==', referentId)
          .where('status', '==', 'paid_confirmed')
          .count()
          .get();
        
        if (confirmedCountSnap.data().count >= config.maxReferralsPerUser) {
          grantToReferent = false;
          console.warn(`[ReferralTrigger] El referente ${referentId} alcanzó su tope de recompensas.`);
        }
      }

      const now = Timestamp.now();

      // --- OPERACIONES DE ESCRITURA ATÓMICA ---

      // A. Recompensa al Referente (si aplica)
      if (grantToReferent) {
        transaction.update(referentRef, {
          'limitesExtra.products': FieldValue.increment(config.rewardReferent)
        });

        const referentLog: ExtraCapacityLog = {
          businessId: referentId,
          businessName: referentName,
          amount: config.rewardReferent,
          reason: 'referido_confirmado_referente',
          origin: 'automatico',
          adminId: null,
          notes: null,
          createdAt: now as any
        };
        transaction.set(db.collection('extraCapacityLogs').doc(), referentLog);
      }

      // B. Recompensa al Referido (siempre se otorga)
      transaction.update(referreeRef, {
        'limitesExtra.products': FieldValue.increment(config.rewardReferree)
      });

      const referreeLog: ExtraCapacityLog = {
        businessId: referreeId,
        businessName: referreeName,
        amount: config.rewardReferree,
        reason: 'referido_confirmado_referido',
        origin: 'automatico',
        adminId: null,
        notes: null,
        createdAt: now as any
      };
      transaction.set(db.collection('extraCapacityLogs').doc(), referreeLog);

      // C. Actualización final del documento de referido
      transaction.update(referralDoc.ref, {
        status: 'paid_confirmed',
        paidConfirmedAt: now,
        referentRewardGranted: grantToReferent,
        referreeRewardGranted: true,
        updatedAt: now
      });
    });

    console.log(`[ReferralTrigger] Otorgamiento procesado exitosamente para referree ${businessId}`);
    return true;

  } catch (error: any) {
    console.error('[ReferralTrigger] Error en el proceso de otorgamiento:', error.message);
    return null;
  }
}
