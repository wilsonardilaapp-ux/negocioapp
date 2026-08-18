'use server';

/**
 * @fileOverview Acción de servidor para el agendamiento público.
 * Realiza una validación atómica de disponibilidad antes de guardar la reserva.
 * Corregido para evitar errores por campos undefined y eliminar la necesidad de índices compuestos en Firestore.
 */

import { getAdminFirestore } from '@/firebase/server-init';
import { isSlotAvailable } from '@/lib/booking-engine';
import type { Reservation, BookingAvailability, BookingService, BookingStaff } from '@/models/booking';
import { sendBookingNotification } from '@/services/booking-notifications';

/**
 * Procesa la confirmación de una reserva desde el flujo público.
 * Implementa sanitización estricta para evitar errores de campos undefined en Firestore.
 * Utiliza filtrado en memoria para evitar el requisito de índices compuestos.
 */
export async function confirmPublicBooking(businessId: string, data: any) {
  if (!businessId) {
    return { success: false, error: 'Identificador de negocio inválido.' };
  }

  try {
    const db = await getAdminFirestore();
    const dateObj = new Date(data.date + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();

    // 1. Resolver profesional objetivo
    const targetStaffId = data.staffId && data.staffId !== 'any' ? data.staffId : null;

    // 2. Consulta paralela optimizada (Sin filtros múltiples para evitar requisito de índice compuesto)
    const [availSnap, resSnap, servSnap, staffSnap] = await Promise.all([
      db.collection('businesses').doc(businessId).collection('bookingAvailability').doc(dayOfWeek.toString()).get(),
      db.collection('businesses').doc(businessId).collection('reservations')
        .where('date', '==', data.date)
        .get(),
      db.collection('businesses').doc(businessId).collection('bookingServices').doc(data.serviceId).get(),
      targetStaffId ? db.collection('businesses').doc(businessId).collection('bookingStaff').doc(targetStaffId).get() : Promise.resolve(null)
    ]);

    if (!availSnap.exists) {
      return { success: false, error: 'El negocio no tiene disponibilidad configurada para este día.' };
    }

    const availability = availSnap.data() as BookingAvailability;
    
    // Filtrado en memoria por staffId para evitar error de índice faltante en Firestore
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
      return { success: false, error: check.reason || 'Este horario ya no está disponible. Por favor elige otro.' };
    }

    // 4. SANITIZACIÓN: Cero valores undefined (Fatal en Admin SDK)
    const now = new Date().toISOString();
    const reservationPayload = {
      businessId: businessId,
      customerName: data.customerName?.trim() || 'Cliente',
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

    // 5. Persistir Reserva (Usando .add() para generar ID automático)
    const docRef = await db.collection('businesses').doc(businessId).collection('reservations').add(reservationPayload);
    
    const createdReservation = { id: docRef.id, ...reservationPayload };

    // 6. NOTIFICACIÓN AUTOMÁTICA (Bloque aislado no bloqueante)
    // El fallo del envío de WhatsApp no debe impedir que el cliente vea su éxito de reserva
    try {
        await sendBookingNotification(
            'onCreate', 
            businessId, 
            createdReservation as any, 
            servSnap.data() as BookingService, 
            staffSnap?.data() as BookingStaff
        );
    } catch (notifErr) {
        console.error("[confirmPublicBooking] Aviso: Notificación WhatsApp no enviada (no fatal):", notifErr);
    }

    return { 
        success: true, 
        reservationId: docRef.id,
        reservation: createdReservation 
    };

  } catch (error: any) {
    // Log detallado para auditoría de errores en el servidor
    console.error('Error fatal en confirmPublicBooking:', error);
    return { success: false, error: 'Error interno al procesar la reserva.' };
  }
}