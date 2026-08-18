'use server';

/**
 * @fileOverview Acción de servidor para el agendamiento público.
 * Realiza una validación atómica de disponibilidad antes de guardar la reserva.
 * Actualizado para disparar notificación de WhatsApp (Fase 7).
 */

import { getAdminFirestore } from '@/firebase/server-init';
import { isSlotAvailable } from '@/lib/booking-engine';
import type { Reservation, BookingAvailability, BookingService, BookingStaff } from '@/models/booking';
import { calculateEndTime } from '@/models/booking';
import { sendBookingNotification } from '@/services/booking-notifications';

export async function confirmPublicBooking(businessId: string, data: Omit<Reservation, 'id' | 'businessId' | 'status' | 'source' | 'createdAt' | 'updatedAt'>) {
  if (!businessId) return { success: false, error: 'Identificador de negocio inválido.' };

  const db = await getAdminFirestore();
  const dateObj = new Date(data.date + 'T00:00:00');
  const dayOfWeek = dateObj.getDay();

  try {
    // 1. Re-validar disponibilidad en el servidor (Atomic check)
    const [availSnap, resSnap, servSnap, staffSnap] = await Promise.all([
      db.collection('businesses').doc(businessId).collection('bookingAvailability').doc(dayOfWeek.toString()).get(),
      db.collection('businesses').doc(businessId).collection('reservations')
        .where('date', '==', data.date)
        .where('staffId', '==', data.staffId)
        .get(),
      db.collection('businesses').doc(businessId).collection('bookingServices').doc(data.serviceId).get(),
      data.staffId ? db.collection('businesses').doc(businessId).collection('bookingStaff').doc(data.staffId).get() : Promise.resolve(null)
    ]);

    if (!availSnap.exists) {
      return { success: false, error: 'El negocio no tiene disponibilidad configurada para este día.' };
    }

    const availability = availSnap.data() as BookingAvailability;
    const existingReservations = resSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Reservation));

    const check = isSlotAvailable(
      { start: data.startTime, end: data.endTime },
      availability,
      existingReservations
    );

    if (!check.available) {
      return { success: false, error: check.reason || 'Este horario ya no está disponible. Por favor elige otro.' };
    }

    // 2. Persistir Reserva
    const resRef = db.collection('businesses').doc(businessId).collection('reservations').doc();
    const now = new Date().toISOString();
    
    const newReservation: Reservation = {
      ...data,
      id: resRef.id,
      businessId,
      status: 'pending', // Reservas web inician en pendiente
      source: 'web',
      createdAt: now,
      updatedAt: now
    };

    await resRef.set(newReservation);

    // --- NOTIFICACIÓN AUTOMÁTICA (Fase 7) ---
    // Disparo asíncrono no bloqueante
    sendBookingNotification('onCreate', businessId, newReservation, servSnap.data() as BookingService, staffSnap?.data() as BookingStaff);

    return { success: true, reservationId: resRef.id };

  } catch (error: any) {
    console.error('[confirmPublicBooking] Error:', error.message);
    return { success: false, error: 'Error interno al procesar la reserva.' };
  }
}
