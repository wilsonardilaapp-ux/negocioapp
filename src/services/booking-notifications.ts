'use server';

/**
 * @fileOverview Servicio maestro de notificaciones de reservas vía WhatsApp.
 */

import { getAdminFirestore } from '@/firebase/server-init';
import { WhatsAppFactory } from './whatsapp-factory';
import { normalizePhoneNumber } from '@/lib/utils';
import type { Reservation, BookingService, BookingStaff } from '@/models/booking';
import { DEFAULT_BOOKING_NOTIFICATION_SETTINGS, type BookingNotificationSettings } from '@/models/booking-notifications';

const replaceVariables = (text: string, data: {
  cliente: string;
  negocio: string;
  servicio: string;
  profesional: string;
  fecha: string;
  hora: string;
  precio: string;
  motivo?: string;
}) => {
  let result = text;
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{${key}}`, 'g');
    result = result.replace(regex, value || '');
  });
  return result;
};

async function getSettings(businessId: string): Promise<BookingNotificationSettings> {
  try {
    const db = await getAdminFirestore();
    const docRef = db.doc(`businesses/${businessId}/bookingSettings/notifications`);
    const snap = await docRef.get();
    return snap.exists ? (snap.data() as BookingNotificationSettings) : DEFAULT_BOOKING_NOTIFICATION_SETTINGS;
  } catch {
    return DEFAULT_BOOKING_NOTIFICATION_SETTINGS;
  }
}

/**
 * Orquesta el envío asíncrono de notificaciones de reserva.
 * Implementa un flujo seguro (Non-blocking) para no afectar la experiencia del usuario.
 */
export async function sendBookingNotification(
  event: keyof BookingNotificationSettings,
  businessId: string,
  reservation: Reservation,
  service?: BookingService,
  staff?: BookingStaff,
  extra?: { reason?: string }
) {
  try {
    const settings = await getSettings(businessId);
    const template = settings[event];

    if (!template?.enabled) return;

    const db = await getAdminFirestore();
    const bizSnap = await db.doc(`businesses/${businessId}`).get();
    const businessName = bizSnap.data()?.name || 'Nuestro Negocio';

    const message = replaceVariables(template.message, {
      cliente: reservation.customerName,
      negocio: businessName,
      servicio: service?.name || reservation.serviceId,
      profesional: staff?.name || reservation.staffId || 'No asignado',
      fecha: reservation.date,
      hora: reservation.startTime,
      precio: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(reservation.price),
      motivo: extra?.reason
    });

    const provider = await WhatsAppFactory.getProvider(businessId);
    if (!provider) {
        console.warn(`[BookingNotifications] No provider configured for ${businessId}`);
        return;
    }

    const cleanPhone = normalizePhoneNumber(reservation.customerPhone);
    const result = await provider.sendMessage(cleanPhone, message);
    
    if (!result.success) {
        console.error(`[BookingNotifications] Failed to send ${event}:`, result.error);
    }

  } catch (error) {
    console.error(`[BookingNotifications] Error in ${event}:`, error);
  }
}
