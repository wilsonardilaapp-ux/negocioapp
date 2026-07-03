'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import type { Referral } from '@/models/referral';
import type { AffiliateConfig } from '@/models/affiliate-config';
import type { ExtraCapacityLog } from '@/models/extra-capacity-log';

/**
 * Confirma el pago de un referido y otorga los premios de capacidad extra
 * a ambos negocios involucrados (referente y referido) en una transacción atómica.
 */
export async function confirmReferralPayment(referralId: string, adminId: string) {
  if (!referralId) return { success: false, error: 'ID de referido no proporcionado.' };

  const db = await getAdminFirestore();
  const referralRef = db.collection('referrals').doc(referralId);
  const configRef = db.doc('adminConfig/affiliates');

  try {
    const result = await db.runTransaction(async (transaction) => {
      // 1. Obtener y validar el referido
      const referralSnap = await transaction.get(referralRef);
      if (!referralSnap.exists) throw new Error('El registro de referido no existe.');
      
      const referral = referralSnap.data() as Referral;
      if (referral.status !== 'pending_payment') {
        throw new Error(`El referido ya está en estado: ${referral.status}`);
      }

      // 2. Obtener configuración de premios
      const configSnap = await transaction.get(configRef);
      if (!configSnap.exists) throw new Error('Configuración de afiliados no encontrada.');
      const config = configSnap.data() as AffiliateConfig;

      // 3. Obtener referencias de negocios
      const referentRef = db.doc(`businesses/${referral.referentBusinessId}`);
      const referreeRef = db.doc(`businesses/${referral.referreeBusinessId}`);
      
      const [referentSnap, referreeSnap] = await Promise.all([
        transaction.get(referentRef),
        transaction.get(referreeRef)
      ]);

      if (!referentSnap.exists) throw new Error('El negocio referente ya no existe.');
      if (!referreeSnap.exists) throw new Error('El negocio referido ya no existe.');

      const referentName = referentSnap.data()?.name || 'Negocio Referente';
      const referreeName = referreeSnap.data()?.name || 'Negocio Referido';

      const now = Timestamp.now();

      // 4. ACTUALIZACIONES ATÓMICAS
      
      // A. Actualizar estado del referido
      transaction.update(referralRef, {
        status: 'paid_confirmed',
        paidConfirmedAt: now,
        referentRewardGranted: true,
        referreeRewardGranted: true,
        adminResponsibleId: adminId,
        updatedAt: now
      } as any);

      // B. Otorgar premio al Referente
      transaction.update(referentRef, {
        'limitesExtra.products': FieldValue.increment(config.rewardReferent)
      });

      // C. Otorgar premio al Referido
      transaction.update(referreeRef, {
        'limitesExtra.products': FieldValue.increment(config.rewardReferree)
      });

      // D. Crear Logs de Auditoría
      const logReferent: ExtraCapacityLog = {
        businessId: referral.referentBusinessId,
        businessName: referentName,
        amount: config.rewardReferent,
        reason: 'referido_confirmado_referente',
        origin: 'manual',
        adminId: adminId,
        notes: `Pago confirmado manualmente por administrador. Ref: ${referral.referralCode}`,
        createdAt: now as any
      };

      const logReferree: ExtraCapacityLog = {
        businessId: referral.referreeBusinessId,
        businessName: referreeName,
        amount: config.rewardReferree,
        reason: 'referido_confirmado_referido',
        origin: 'manual',
        adminId: adminId,
        notes: `Recompensa de bienvenida (pago inicial confirmado). Ref: ${referral.referralCode}`,
        createdAt: now as any
      };

      transaction.set(db.collection('extraCapacityLogs').doc(), logReferent);
      transaction.set(db.collection('extraCapacityLogs').doc(), logReferree);

      return { referentName, referreeName };
    });

    revalidatePath('/superadmin/affiliates');
    return { 
      success: true, 
      message: `Pago confirmado para ${result.referreeName}. Premios otorgados con éxito.` 
    };

  } catch (error: any) {
    console.error('[confirmReferralPayment] Error:', error.message);
    return { success: false, error: error.message };
  }
}
