'use server';

/**
 * @fileOverview Acción de servidor para el agendamiento público.
 * Implementa consulta index-free, validación robusta y sanitización total para Firestore Admin SDK.
 */

import { getAdminFirestore } from '@/firebase/server-init';
import { isSlotAvailable, calculateEndTime } from '@/lib/booking-engine';
import { sendBookingNotification } from '@/services/booking-notifications';
import type { Reservation, BookingAvailability, BookingService, BookingStaff } from '@/models/booking';

/**
 * Procesa la confirmación de una reserva desde el flujo público.
 * Realiza filtrado en memoria para evitar el requisito de índices compuestos en Firestore.
 */
export async function confirmPublicBooking(businessId: string, bookingData: any) {
  // 1. VALIDACIÓN PREVENTIVA DE ENTRADA (GUARD CLAUSE)
  if (!businessId || typeof businessId !== 'string' || businessId.trim() === '') {
    return { success: false, error: "ID de negocio no válido o ausente." };
  }
  if (!bookingData || !bookingData.date || !bookingData.startTime) {
    return { success: false, error: "La fecha y hora de la cita son obligatorias." };
  }
  if (!bookingData.customerName?.trim() || !bookingData.customerPhone?.trim()) {
    return { success: false, error: "El nombre y WhatsApp del cliente son obligatorios." };
  }

  try {
    const db = await getAdminFirestore();
    
    // 2. RESOLUCIÓN DE JORNADA Y DISPONIBILIDAD
    const dateObj = new Date(bookingData.date + 'T00:00:00');
    if (isNaN(dateObj.getTime())) {
      return { success: false, error: "Formato de fecha inválido." };
    }
    const dayOfWeek = dateObj.getDay();

    const targetStaffId = (bookingData.staffId && bookingData.staffId !== 'any') ? String(bookingData.staffId) : null;

    // --- CONSULTA SEGURA DE SERVICIO Y DISPONIBILIDAD ---
    const promises: any[] = [
      db.collection('businesses').doc(businessId).collection('bookingAvailability').doc(dayOfWeek.toString()).get(),
      db.collection('businesses').doc(businessId).collection('reservations')
        .where('date', '==', String(bookingData.date))
        .get()
    ];

    // Solo consultamos el servicio si el ID es válido
    if (bookingData.serviceId && typeof bookingData.serviceId === 'string' && bookingData.serviceId.trim() !== '') {
        promises.push(db.collection('businesses').doc(businessId).collection('bookingServices').doc(bookingData.serviceId).get());
    } else {
        promises.push(Promise.resolve(null));
    }

    // Solo consultamos el staff si el ID es válido
    if (targetStaffId && targetStaffId.trim() !== '') {
        promises.push(db.collection('businesses').doc(businessId).collection('bookingStaff').doc(targetStaffId).get());
    } else {
        promises.push(Promise.resolve(null));
    }

    const [availSnap, resSnap, servSnap, staffSnap] = await Promise.all(promises);

    // --- DETERMINAR VALORES DEL SERVICIO (CON FALLBACKS) ---
    let serviceName = String(bookingData.serviceName || 'Servicio');
    let servicePrice = Number(bookingData.price) || 0;
    let durationMinutes = Number(bookingData.durationMinutes) || 30;

    if (servSnap && servSnap.exists) {
      const sData = servSnap.data();
      serviceName = String(sData?.name || serviceName);
      servicePrice = Number(sData?.price) || servicePrice;
      durationMinutes = Number(sData?.durationMinutes) || durationMinutes;
    }

    // --- DETERMINAR VALORES DEL STAFF (CON FALLBACKS) ---
    let staffName = (targetStaffId && targetStaffId !== 'any') ? String(bookingData.staffName || 'Profesional') : 'Cualquier Profesional';
    if (staffSnap && staffSnap.exists) {
      staffName = String(staffSnap.data()?.name || staffName);
    }

    // --- VALIDACIÓN DE DISPONIBILIDAD EN SERVIDOR ---
    if (availSnap.exists) {
      const availability = availSnap.data() as BookingAvailability;
      const allDayReservations = resSnap.docs.map((doc: any) => ({ ...doc.data(), id: doc.id } as Reservation));
      
      const existingReservations = targetStaffId 
        ? allDayReservations.filter((r: Reservation) => r.staffId === targetStaffId)
        : allDayReservations;

      const endTime = calculateEndTime(bookingData.startTime, durationMinutes);
      const check = isSlotAvailable(
        { start: String(bookingData.startTime), end: endTime },
        availability,
        existingReservations
      );

      if (!check.available) {
        return { success: false, error: check.reason || 'Este horario ya no está disponible.' };
      }
    }

    // 3. PERSISTENCIA: CONSTRUCCIÓN DE PAYLOAD TOTALMENTE SANITIZADO (CERO UNDEFINED)
    const now = new Date().toISOString();
    const reservationPayload = {
      businessId: String(businessId),
      customerName: String(bookingData.customerName || 'Cliente').trim(),
      customerPhone: String(bookingData.customerPhone || '').trim(),
      customerEmail: bookingData.customerEmail?.trim() || null,
      notes: bookingData.notes?.trim() || null,
      serviceId: String(bookingData.serviceId || 'general'),
      serviceName: String(serviceName),
      staffId: targetStaffId,
      staffName: String(staffName),
      date: String(bookingData.date),
      startTime: String(bookingData.startTime),
      endTime: String(bookingData.endTime || calculateEndTime(bookingData.startTime, durationMinutes)),
      price: Number(servicePrice),
      durationMinutes: Number(durationMinutes),
      status: 'pending',
      source: 'web',
      loyaltyPointsGranted: false,
      createdAt: now,
      updatedAt: now
    };

    // Guardar la reserva
    const docRef = await db
      .collection('businesses')
      .doc(businessId)
      .collection('reservations')
      .add(reservationPayload);
    
    const createdReservation = { id: docRef.id, ...reservationPayload };

    // 4. DISPARO DE NOTIFICACIÓN WHATSAPP (AISLADO)
    try {
        const serviceObj = servSnap?.exists ? (servSnap.data() as BookingService) : undefined;
        const staffObj = staffSnap?.exists ? (staffSnap.data() as BookingStaff) : undefined;
        await sendBookingNotification('onCreate', businessId, createdReservation as Reservation, serviceObj, staffObj);
    } catch (notifErr) {
        console.error("Aviso: Notificación WhatsApp no enviada (no fatal):", notifErr);
    }

    return { 
        success: true, 
        reservationId: docRef.id,
        reservation: createdReservation 
    };

  } catch (error: any) {
    console.error('FATAL ERROR IN confirmPublicBooking:', error);
    // Devolvemos el error real para diagnóstico, con fallback genérico si no hay mensaje
    return { 
      success: false, 
      error: error?.message || "Error interno de servidor al procesar la reserva." 
    };
  }
}