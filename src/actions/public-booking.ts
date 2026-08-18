'use server';

/**
 * @fileOverview Acción de servidor para el agendamiento público.
 * Realiza una validación atómica de disponibilidad antes de guardar la reserva.
 * Corregido para evitar errores por campos undefined y aislar fallos de notificación.
 */

import { getAdminFirestore } from '@/firebase/server-init';
import { isSlotAvailable } from '@/lib/booking-engine';
import type { Reservation, BookingAvailability, BookingService, BookingStaff } from '@/models/booking';
import { sendBookingNotification } from '@/services/booking-notifications';

/**
 * Procesa la confirmación de una reserva desde el flujo público.
 * Implementa sanitización estricta para evitar errores de campos undefined en Firestore.
 */
export async function confirmPublicBooking(businessId: string, data: any) {
  if (!businessId) {
    return { success: false, error: 'Identificador de negocio inválido.' };
  }

  try {
    const db = await getAdminFirestore();
    const dateObj = new Date(data.date + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();

    // 1. Re-validar disponibilidad en el servidor (Atomic check)
    // Filtramos staffId para manejar la opción 'any' correctamente en la consulta
    const targetStaffId = data.staffId && data.staffId !== 'any' ? data.staffId : null;

    const [availSnap, resSnap, servSnap, staffSnap] = await Promise.all([
      db.collection('businesses').doc(businessId).collection('bookingAvailability').doc(dayOfWeek.toString()).get(),
      db.collection('businesses').doc(businessId).collection('reservations')
        .where('date', '==', data.date)
        .where('staffId', '==', targetStaffId)
        .get(),
      db.collection('businesses').doc(businessId).collection('bookingServices').doc(data.serviceId).get(),
      targetStaffId ? db.collection('businesses').doc(businessId).collection('bookingStaff').doc(targetStaffId).get() : Promise.resolve(null)
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

    // 2. SANITIZACIÓN: Limpiar campos para evitar undefined (fatal en Firestore)
    const now = new Date().toISOString();
    const sanitizedData = {
      businessId: businessId,
      customerName: data.customerName?.trim() || '',
      customerPhone: data.customerPhone?.trim() || '',
      customerEmail: data.customerEmail?.trim() || null,
      notes: data.notes?.trim() || null,
      serviceId: data.serviceId || '',
      serviceName: data.serviceName || 'Servicio',
      staffId: targetStaffId,
      staffName: data.staffName && data.staffName !== 'any' ? data.staffName : 'Cualquier Profesional',
      date: data.date, // Formato YYYY-MM-DD
      startTime: data.startTime, // Formato HH:mm
      endTime: data.endTime, // Formato HH:mm
      price: Number(data.price) || 0,
      durationMinutes: Number(data.durationMinutes) || 30,
      status: 'pending' as const,
      source: 'web' as const,
      loyaltyPointsGranted: false,
      createdAt: now,
      updatedAt: now
    };

    // 3. Persistir Reserva
    const resRef = db.collection('businesses').doc(businessId).collection('reservations').doc();
    await resRef.set(sanitizedData);
    
    const newReservation = { id: resRef.id, ...sanitizedData };

    // 4. NOTIFICACIÓN AUTOMÁTICA (Bloque aislado no bloqueante)
    // El fallo del envío de WhatsApp no debe impedir que el cliente vea su éxito de reserva
    try {
        await sendBookingNotification(
            'onCreate', 
            businessId, 
            newReservation as any, 
            servSnap.data() as BookingService, 
            staffSnap?.data() as BookingStaff
        );
    } catch (notifErr) {
        console.error("[confirmPublicBooking] Error no fatal al enviar WhatsApp de reserva:", notifErr);
    }

    return { 
        success: true, 
        reservationId: resRef.id,
        reservation: newReservation 
    };

  } catch (error: any) {
    // Log detallado para auditoría de errores en el servidor
    console.error('Error fatal en confirmPublicBooking:', error);
    return { success: false, error: 'Error interno al procesar la reserva.' };
  }
}
