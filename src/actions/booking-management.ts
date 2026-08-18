'use server';

/**
 * @fileOverview Acciones de servidor para la gestión administrativa del ciclo de vida de reservas.
 * Actualizado para incluir notificaciones automáticas y fidelización (Fase 8).
 */

import { getAdminFirestore } from '@/firebase/server-init';
import { isSlotAvailable } from '@/lib/booking-engine';
import type { Reservation, ReservationStatus, BookingAvailability, BookingService, BookingStaff } from '@/models/booking';
import { calculateEndTime } from '@/models/booking';
import { revalidatePath } from 'next/cache';
import { sendBookingNotification } from '@/services/booking-notifications';
import { grantLoyaltyPointsTransactional } from './loyalty';
import type { Business } from '@/models/business';

/**
 * Actualiza el estado de una reserva.
 * Si el estado es 'confirmed', intenta notificar al cliente.
 * Si el estado es 'completed', otorga puntos de fidelización de forma transaccional.
 */
export async function updateReservationStatus(businessId: string, reservationId: string, newStatus: ReservationStatus) {
  if (!businessId || !reservationId) return { success: false, error: 'ID de reserva inválido.' };

  const db = await getAdminFirestore();
  const resRef = db.collection('businesses').doc(businessId).collection('reservations').doc(reservationId);
  const businessRef = db.collection('businesses').doc(businessId);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const resSnap = await transaction.get(resRef);
      if (!resSnap.exists) throw new Error('La reserva no existe.');
      
      const resData = resSnap.data() as Reservation;
      const updates: any = {
        status: newStatus,
        updatedAt: new Date().toISOString()
      };

      let pointsAwarded = 0;

      // --- LÓGICA DE FIDELIZACIÓN (Fase 8) ---
      if (newStatus === 'completed' && !resData.loyaltyPointsGranted) {
        const busSnap = await transaction.get(businessRef);
        const busData = busSnap.data() as Business;
        const threshold = busData?.loyaltyConfig?.amountThreshold || 1000;
        
        pointsAwarded = Math.floor(resData.price / threshold);

        if (pointsAwarded > 0) {
          await grantLoyaltyPointsTransactional(
            transaction,
            db as any,
            businessId,
            resData.customerPhone,
            pointsAwarded,
            `Cita completada - ID: ${reservationId.slice(-6).toUpperCase()}`,
            `earn_booking_${reservationId}`
          );
          
          updates.loyaltyPointsGranted = true;
          updates.pointsEarned = pointsAwarded;
          updates.completedAt = new Date().toISOString();
        }
      }

      transaction.update(resRef, updates);
      return { resData, pointsAwarded };
    });

    // --- NOTIFICACIÓN AUTOMÁTICA (Fase 7) ---
    if (newStatus === 'confirmed') {
      const [servSnap, staffSnap] = await Promise.all([
        db.collection('businesses').doc(businessId).collection('bookingServices').doc(result.resData.serviceId).get(),
        result.resData.staffId ? db.collection('businesses').doc(businessId).collection('bookingStaff').doc(result.resData.staffId).get() : Promise.resolve(null)
      ]);
      sendBookingNotification('onConfirm', businessId, result.resData, servSnap.data() as BookingService, staffSnap?.data() as BookingStaff);
    }

    revalidatePath('/dashboard/reservas');
    return { success: true, pointsAwarded: result.pointsAwarded };
  } catch (error: any) {
    console.error("[updateReservationStatus] Error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Cancela una reserva registrando el motivo y notificando al cliente.
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

    const snap = await resRef.get();
    if (snap.exists) {
        const resData = snap.data() as Reservation;
        sendBookingNotification('onCancel', businessId, resData, undefined, undefined, { reason });
    }

    revalidatePath('/dashboard/reservas');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Reprograma una reserva realizando una validación atómica de disponibilidad y notificando el cambio.
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
    const result = await db.runTransaction(async (transaction) => {
      const resSnap = await transaction.get(resRef);
      if (!resSnap.exists) throw new Error('La reserva no existe.');
      
      const currentData = resSnap.data() as Reservation;
      const staffIdToValidate = newStaffId || currentData.staffId;
      
      const serviceSnap = await db.collection('businesses').doc(businessId).collection('bookingServices').doc(currentData.serviceId).get();
      if (!serviceSnap.exists) throw new Error('Servicio no encontrado.');
      const service = serviceSnap.data() as BookingService;

      const newEndTime = calculateEndTime(newStartTime, service.durationMinutes);
      const dateObj = new Date(newDate + 'T00:00:00');
      const dayOfWeek = dateObj.getDay();

      const availSnap = await db.collection('businesses').doc(businessId).collection('bookingAvailability').doc(dayOfWeek.toString()).get();
      if (!availSnap.exists) throw new Error('No hay disponibilidad configurada para este día.');
      const availability = availSnap.data() as BookingAvailability;

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

      const historyEntry = {
        previousDate: currentData.date,
        previousStartTime: currentData.startTime,
        previousEndTime: currentData.endTime,
        rescheduledAt: new Date().toISOString()
      };

      const updatedHistory = [...(currentData.rescheduleHistory || []), historyEntry];

      const updatedReservation = {
        ...currentData,
        date: newDate,
        startTime: newStartTime,
        endTime: newEndTime,
        staffId: staffIdToValidate,
        status: 'confirmed',
        rescheduleHistory: updatedHistory,
        updatedAt: new Date().toISOString()
      };

      transaction.update(resRef, updatedReservation);
      const staffSnap = await db.collection('businesses').doc(businessId).collection('bookingStaff').doc(staffIdToValidate!).get();

      return { 
        updatedReservation: updatedReservation as Reservation, 
        service: service as BookingService, 
        staff: staffSnap.data() as BookingStaff 
      };
    });

    if (result.updatedReservation) {
        sendBookingNotification('onReschedule', businessId, result.updatedReservation, result.service, result.staff);
    }

    revalidatePath('/dashboard/reservas');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
