'use server';

/**
 * @fileOverview Acciones de servidor para la gestión de ajustes de notificaciones de reservas.
 */

import { getAdminFirestore } from '@/firebase/server-init';
import { revalidatePath } from 'next/cache';
import { DEFAULT_BOOKING_NOTIFICATION_SETTINGS, type BookingNotificationSettings } from '@/models/booking-notifications';

export async function getNotificationSettings(businessId: string): Promise<BookingNotificationSettings> {
  const db = await getAdminFirestore();
  const docRef = db.doc(`businesses/${businessId}/bookingSettings/notifications`);
  const snap = await docRef.get();
  return snap.exists ? (snap.data() as BookingNotificationSettings) : DEFAULT_BOOKING_NOTIFICATION_SETTINGS;
}

export async function saveNotificationSettings(businessId: string, settings: BookingNotificationSettings) {
  if (!businessId) return { success: false, error: 'ID de negocio no proporcionado.' };

  const db = await getAdminFirestore();
  const docRef = db.doc(`businesses/${businessId}/bookingSettings/notifications`);
  
  try {
    await docRef.set(settings, { merge: true });
    revalidatePath('/dashboard/reservas/notificaciones');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
