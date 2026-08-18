'use client';

import type { BookingAvailability, TimeRange, Reservation } from '@/models/booking';

/**
 * Convierte una cadena de hora "HH:mm" a minutos totales desde las 00:00.
 */
export function timeToMinutes(time: string): number {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Verifica si un bloque de tiempo [start, end] está contenido dentro de otro.
 */
export function isTimeContained(inner: TimeRange, outer: TimeRange): boolean {
  const innerStart = timeToMinutes(inner.start);
  const innerEnd = timeToMinutes(inner.end);
  const outerStart = timeToMinutes(outer.start);
  const outerEnd = timeToMinutes(outer.end);

  return innerStart >= outerStart && innerEnd <= outerEnd;
}

/**
 * Verifica si dos rangos de tiempo se solapan.
 */
export function doTimesOverlap(range1: TimeRange, range2: TimeRange): boolean {
  const start1 = timeToMinutes(range1.start);
  const end1 = timeToMinutes(range1.end);
  const start2 = timeToMinutes(range2.start);
  const end2 = timeToMinutes(range2.end);

  return start1 < end2 && end1 > start2;
}

/**
 * Motor de validación de disponibilidad blindado contra valores undefined.
 */
export function isSlotAvailable(
  proposed: TimeRange,
  availability: BookingAvailability | null | undefined,
  existingReservations: Reservation[] = []
): { available: boolean; reason?: string } {
  // 1. Validar si el negocio/profesional está abierto
  if (!availability || !availability.isOpen) {
    return { available: false, reason: 'El profesional no atiende este día.' };
  }

  // 2. Validar jornada (shifts)
  const shifts = Array.isArray(availability.shifts) ? availability.shifts : [];
  const inJornada = shifts.some(shift => isTimeContained(proposed, shift));
  
  if (!inJornada) {
    return { available: false, reason: 'Fuera del horario de atención.' };
  }

  // 3. Validar descansos (breaks)
  const breaks = Array.isArray(availability.breaks) ? availability.breaks : [];
  const inBreak = breaks.some(brk => doTimesOverlap(proposed, brk));
  
  if (inBreak) {
    return { available: false, reason: 'Coincide con el horario de descanso.' };
  }

  // 4. Validar colisiones con otras reservas activas
  const safeReservations = Array.isArray(existingReservations) ? existingReservations : [];
  const collision = safeReservations
    .filter(r => r && r.status !== 'cancelled' && r.status !== 'no_show')
    .some(r => doTimesOverlap(proposed, { start: r.startTime, end: r.endTime }));

  if (collision) {
    return { available: false, reason: 'Este horario ya no está disponible.' };
  }

  return { available: true };
}

/**
 * Genera slots de tiempo cada X minutos.
 */
export function generateTimeSlots(intervalMinutes: number = 15): string[] {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += intervalMinutes) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
}
