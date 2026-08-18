'use server';

/**
 * @fileOverview Acciones de servidor para la gestión administrativa del ciclo de vida de reservas.
 */

import { getAdminFirestore } from '@/firebase/server-init';
import { isSlotAvailable } from '@/lib/booking-engine';
import type { Reservation, ReservationStatus, BookingAvailability, BookingService } from '@/models/booking';
import { calculateEndTime } from '@/models/booking';
import { revalidatePath } from 'next/cache';

/**
 * Actualiza el estado de una reserva (Ej: Confirmar, Completar, No asistió).
 */
export async function updateReservationStatus(businessId: string, reservationId: string, newStatus: ReservationStatus) {
  if (!businessId || !reservationId) return { success: false, error: 'ID de reserva inválido.' };

  const db = await getAdminFirestore();
  const resRef = db.collection('businesses').doc(businessId).collection('reservations').doc(reservationId);

  try {
    await resRef.update({
      status: newStatus,
      updatedAt: new Date().toISOString()
    });

    revalidatePath('/dashboard/reservas');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Cancela una reserva registrando el motivo.
 */
export async function cancelReservation(businessId: string, reservationId: string, reason: string) {
  if (!businessId || !reservationId) return { success: false, error: 'ID de reserva inválido.' };

  const db = await getAdminFirestore();
  const resRef = db.collection('businesses').doc(businessId).collection('reservations').doc(reservationId);

  try {
    await resRef.update({
      status: 'cancelled',
      cancellationReason: reason,
      updatedAt: new Date().toISOString()
    });

    revalidatePath('/dashboard/reservas');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Reprograma una reserva realizando una validación atómica de disponibilidad en el nuevo horario.
 */
export async function rescheduleReservation(
  businessId: string, 
  reservationId: string, 
  newDate: string, 
  newStartTime: string,
  newStaffId?: string
) {
  if (!businessId || !reservationId) return { success: false, error: 'Datos de reserva insuficientes.' };

  const db = await getAdminFirestore();
  const resRef = db.collection('businesses').doc(businessId).collection('reservations').doc(reservationId);

  try {
    return await db.runTransaction(async (transaction) => {
      const resSnap = await transaction.get(resRef);
      if (!resSnap.exists) throw new Error('La reserva no existe.');
      
      const currentData = resSnap.data() as Reservation;
      const staffIdToValidate = newStaffId || currentData.staffId;
      
      // Obtener servicio para la duración
      const serviceSnap = await db.collection('businesses').doc(businessId).collection('bookingServices').doc(currentData.serviceId).get();
      if (!serviceSnap.exists) throw new Error('Servicio no encontrado.');
      const service = serviceSnap.data() as BookingService;

      const newEndTime = calculateEndTime(newStartTime, service.durationMinutes);
      const dateObj = new Date(newDate + 'T00:00:00');
      const dayOfWeek = dateObj.getDay();

      // Consultar disponibilidad del profesional para el nuevo día
      const availSnap = await db.collection('businesses').doc(businessId).collection('bookingAvailability').doc(dayOfWeek.toString()).get();
      if (!availSnap.exists) throw new Error('No hay disponibilidad configurada para este día.');
      const availability = availSnap.data() as BookingAvailability;

      // Consultar otras reservas del profesional en la nueva fecha (excluyendo la actual)
      const existingSnap = await db.collection('businesses').doc(businessId).collection('reservations')
        .where('date', '==', newDate)
        .where('staffId', '==', staffIdToValidate)
        .get();
      
      const otherReservations = existingSnap.docs
        .map(d => ({ ...d.data(), id: d.id } as Reservation))
        .filter(r => r.id !== reservationId);

      const check = isSlotAvailable(
        { start: newStartTime, end: newEndTime },
        availability,
        otherReservations
      );

      if (!check.available) {
        throw new Error(check.reason || 'El nuevo horario no está disponible.');
      }

      // Registrar historial de reprogramación
      const historyEntry = {
        previousDate: currentData.date,
        previousStartTime: currentData.startTime,
        previousEndTime: currentData.endTime,
        rescheduledAt: new Date().toISOString()
      };

      const updatedHistory = [...(currentData.rescheduleHistory || []), historyEntry];

      transaction.update(resRef, {
        date: newDate,
        startTime: newStartTime,
        endTime: newEndTime,
        staffId: staffIdToValidate,
        status: 'confirmed',
        rescheduleHistory: updatedHistory,
        updatedAt: new Date().toISOString()
      });

      return { success: true };
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
