/**
 * @fileOverview Lógica del trigger para activación de recompensas de referidos.
 * Esta lógica está diseñada para ejecutarse como una Cloud Function (Node.js).
 */

import { getAdminFirestore } from '../server-init';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { Referral } from '../../models/referral';
import type { AffiliateConfig } from '../../models/affiliate-config';
import type { ExtraCapacityLog } from '../../models/extra-capacity-log';

/**
 * Simulación de la Cloud Function onWrite para suscripciones.
 * En un entorno de producción real, este código viviría en /functions/index.js.
 */
export async function onSubscriptionActivated(businessId: string, statusAfter: string) {
  if (statusAfter !== 'active') return null;

  const db = await getAdminFirestore();

  try {
    // 1. Buscar referido pendiente para este negocio (referree)
    const referralsRef = db.collection('referrals');
    const referralQuery = await referralsRef
      .where('referreeBusinessId', '==', businessId)
      .where('status', '==', 'pending_payment')
      .limit(1)
      .get();

    if (referralQuery.empty) {
      console.log(`[ReferralTrigger] No hay referido pendiente para el negocio ${businessId}.`);
      return null;
    }

    const referralDoc = referralQuery.docs[0];
    const referralData = referralDoc.data() as Referral;

    // 2. Ejecutar otorgamiento en una transacción atómica
    await db.runTransaction(async (transaction) => {
      // Re-leer el referido para asegurar integridad
      const freshReferralSnap = await transaction.get(referralDoc.ref);
      const freshReferral = freshReferralSnap.data() as Referral;

      if (freshReferral.status !== 'pending_payment' || freshReferral.referentRewardGranted) {
        throw new Error('El referido ya ha sido procesado o no está pendiente.');
      }

      // Obtener configuración de afiliados
      const configSnap = await transaction.get(db.doc('adminConfig/affiliates'));
      if (!configSnap.exists) throw new Error('Configuración de afiliados no encontrada.');
      const config = configSnap.data() as AffiliateConfig;

      const referentId = freshReferral.referentBusinessId;
      const referreeId = freshReferral.referreeBusinessId;

      // Obtener nombres de negocios para los logs
      const [referentSnap, referreeSnap] = await Promise.all([
        transaction.get(db.doc(`businesses/${referentId}`)),
        transaction.get(db.doc(`businesses/${referreeId}`))
      ]);

      const referentName = referentSnap.data()?.name || 'Negocio Referente';
      const referreeName = referreeSnap.data()?.name || 'Negocio Referido';

      // Verificar tope de referidos para el referente
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

      // --- OPERACIONES DE OTORGAMIENTO ---

      // A. Recompensa al Referente (si no excedió tope)
      if (grantToReferent) {
        transaction.update(db.doc(`businesses/${referentId}`), {
          'limitesExtra.products': FieldValue.increment(config.rewardReferent)
        });

        const referentLog: ExtraCapacityLog = {
          businessId: referentId,
          businessName: referentName,
          amount: config.rewardReferent,
          reason: 'referido_confirmado_referente',
          origin: 'automatico',
          adminId: null,
          notes: `Recompensa por referir a ${referreeName}`,
          createdAt: now as any
        };
        transaction.set(db.collection('extraCapacityLogs').doc(), referentLog);
      }

      // B. Recompensa al Referido (siempre se otorga)
      transaction.update(db.doc(`businesses/${referreeId}`), {
        'limitesExtra.products': FieldValue.increment(config.rewardReferree)
      });

      const referreeLog: ExtraCapacityLog = {
        businessId: referreeId,
        businessName: referreeName,
        amount: config.rewardReferree,
        reason: 'referido_confirmado_referido',
        origin: 'automatico',
        adminId: null,
        notes: `Recompensa por registrarse con código de ${referentName}`,
        createdAt: now as any
      };
      transaction.set(db.collection('extraCapacityLogs').doc(), referreeLog);

      // C. Actualizar el documento de Referido
      transaction.update(referralDoc.ref, {
        status: 'paid_confirmed',
        paidConfirmedAt: now,
        referentRewardGranted: grantToReferent,
        referreeRewardGranted: true,
        updatedAt: now
      });
    });

    console.log(`[ReferralTrigger] Proceso completado exitosamente para el referido ${referralDoc.id}`);
    return true;

  } catch (error: any) {
    console.error('[ReferralTrigger] Error en la transacción:', error.message);
    return null;
  }
}
