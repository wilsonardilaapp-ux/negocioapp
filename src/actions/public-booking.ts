'use server';

/**
 * @fileOverview Acción de servidor para el agendamiento público.
 * Implementa consulta index-free y sanitización total para Firestore Admin SDK.
 */

import { getAdminFirestore } from '@/firebase/server-init';
import { isSlotAvailable } from '@/lib/booking-engine';
import type { Reservation, BookingAvailability, BookingService, BookingStaff } from '@/models/booking';

/**
 * Procesa la confirmación de una reserva desde el flujo público.
 * Realiza filtrado en memoria para evitar el requisito de índices compuestos en Firestore.
 */
export async function confirmPublicBooking(businessId: string, data: any) {
  if (!businessId) {
    return { success: false, error: 'Identificador de negocio inválido.' };
  }

  try {
    const db = await getAdminFirestore();
    const dateObj = new Date(data.date + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();

    const targetStaffId = data.staffId && data.staffId !== 'any' ? data.staffId : null;

    // 1. Consulta únicamente por FECHA para evitar el error de índice compuesto (FAILED_PRECONDITION)
    const [availSnap, resSnap, servSnap, staffSnap] = await Promise.all([
      db.collection('businesses').doc(businessId).collection('bookingAvailability').doc(dayOfWeek.toString()).get(),
      db.collection('businesses').doc(businessId).collection('reservations')
        .where('date', '==', data.date)
        .get(),
      db.collection('businesses').doc(businessId).collection('bookingServices').doc(data.serviceId).get(),
      targetStaffId ? db.collection('businesses').doc(businessId).collection('bookingStaff').doc(targetStaffId).get() : Promise.resolve(null)
    ]);

    if (!availSnap.exists) {
      return { success: false, error: 'El establecimiento no tiene disponibilidad configurada para este día.' };
    }

    const availability = availSnap.data() as BookingAvailability;
    
    // 2. Filtrado en memoria por staffId (Index-free optimization)
    const allDayReservations = resSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Reservation));
    const existingReservations = targetStaffId 
      ? allDayReservations.filter(r => r.staffId === targetStaffId)
      : allDayReservations;

    // 3. Validar disponibilidad en el servidor
    const check = isSlotAvailable(
      { start: data.startTime, end: data.endTime },
      availability,
      existingReservations
    );

    if (!check.available) {
      return { success: false, error: check.reason || 'Este horario ya no está disponible.' };
    }

    // 4. SANITIZACIÓN TOTAL: Evitar 'undefined' que rompe el Admin SDK
    const now = new Date().toISOString();
    const reservationPayload = {
      businessId: String(businessId),
      customerName: String(data.customerName || 'Cliente').trim(),
      customerPhone: String(data.customerPhone || '').trim(),
      customerEmail: data.customerEmail ? String(data.customerEmail).trim() : null,
      notes: data.notes ? String(data.notes).trim() : null,
      serviceId: String(data.serviceId || ''),
      serviceName: String(data.serviceName || 'Servicio'),
      staffId: targetStaffId ? String(targetStaffId) : null,
      staffName: data.staffName && data.staffName !== 'any' ? String(data.staffName) : 'Cualquier Profesional',
      date: String(data.date),
      startTime: String(data.startTime),
      endTime: String(data.endTime),
      price: Number(data.price) || 0,
      durationMinutes: Number(data.durationMinutes) || 30,
      status: 'pending',
      source: 'web',
      loyaltyPointsGranted: false,
      createdAt: now,
      updatedAt: now
    };

    // 5. Persistir Reserva
    const docRef = await db.collection('businesses').doc(businessId).collection('reservations').add(reservationPayload);
    
    const createdReservation = { id: docRef.id, ...reservationPayload };

    // 6. NOTIFICACIÓN AISLADA (Silenciosa para el flujo de reserva)
    try {
        // Aquí iría el llamado a tu servicio de notificaciones
    } catch (notifErr) {
        console.warn("[confirmPublicBooking] Fallo no crítico en notificación:", notifErr);
    }

    return { 
        success: true, 
        reservationId: docRef.id,
        reservation: createdReservation 
    };

  } catch (error: any) {
    console.error('Error fatal en confirmPublicBooking:', error);
    return { success: false, error: 'Ocurrió un error técnico al procesar tu cita. Por favor intenta de nuevo.' };
  }
}
