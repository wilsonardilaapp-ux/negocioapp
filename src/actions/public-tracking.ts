'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * @fileOverview Acción de servidor para registrar visitas y escaneos de forma atómica.
 * Utiliza Firebase Admin para garantizar la integridad de los contadores.
 */

export async function recordBookingVisit(businessId: string, source?: string, serviceId?: string) {
  if (!businessId) return { success: false };

  try {
    const db = await getAdminFirestore();
    const analyticsRef = db.doc(`businesses/${businessId}/bookingAnalytics/summary`);

    const now = new Date().toISOString();
    const updates: any = {
      lastActivityAt: now,
      updatedAt: now
    };

    // Incrementar contadores basados en el origen (source)
    if (source === 'qr_stand') {
      updates.qrScans = FieldValue.increment(1);
    } else if (source === 'direct_link') {
      updates.masterLinkVisits = FieldValue.increment(1);
    } else if (source === 'service_link') {
      updates.totalServiceLinkVisits = FieldValue.increment(1);
      if (serviceId) {
        // Incremento dinámico por ID de servicio
        updates[`serviceLinkVisits.${serviceId}`] = FieldValue.increment(1);
      }
    }

    await analyticsRef.set(updates, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('[recordBookingVisit] Error fatal:', error);
    return { success: false };
  }
}
