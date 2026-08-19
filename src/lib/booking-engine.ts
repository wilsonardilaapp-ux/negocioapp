/**
 * @fileOverview Motor de lógica pura para el sistema de reservas.
 * Contiene funciones matemáticas y de validación compartidas entre cliente y servidor.
 */

import type { BookingAvailability, TimeRange, Reservation } from '@/models/booking';

/**
 * Calcula la hora de fin sumando la duración a la hora de inicio.
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  if (!startTime) return '00:00';
  try {
    const [hoursStr, minutesStr] = startTime.split(':');
    const hours = parseInt(hoursStr, 10) || 0;
    const minutes = parseInt(minutesStr, 10) || 0;
    const totalMinutes = hours * 60 + minutes + (Number(durationMinutes) || 0);
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  } catch {
    return startTime;
  }
}

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
 * Motor de validación de disponibilidad.
 * Se utiliza tanto en la generación de slots (cliente) como en la validación final (servidor).
 */
export function isSlotAvailable(
  proposed: TimeRange,
  availability: BookingAvailability | null | undefined,
  existingReservations: Reservation[] = []
): { available: boolean; reason?: string } {
  if (!availability || !availability.isOpen) {
    return { available: false, reason: 'El profesional no atiende este día.' };
  }

  // 1. Validar dentro de la Jornada Laboral
  const shifts = Array.isArray(availability.shifts) ? availability.shifts : [];
  const inJornada = shifts.some(shift => isTimeContained(proposed, shift));
  
  if (!inJornada) {
    return { available: false, reason: 'Fuera del horario de atención.' };
  }

  // 2. Validar solapamiento con Descansos (Almuerzos/Pausas)
  const breaks = Array.isArray(availability.breaks) ? availability.breaks : [];
  const inBreak = breaks.some(brk => doTimesOverlap(proposed, brk));
  
  if (inBreak) {
    return { available: false, reason: 'Coincide con el horario de descanso.' };
  }

  // 3. Validar colisión con citas existentes (Excluyendo canceladas)
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

/**
 * Genera la lista de turnos disponibles filtrando por disponibilidad, descansos y citas.
 * Implementa simetría total con la validación del servidor.
 */
export function generateAvailableSlots(
  availability: BookingAvailability,
  serviceDuration: number = 30,
  existingReservations: Reservation[] = [],
  selectedDate?: Date
): string[] {
  if (!availability || !availability.isOpen) return [];

  const validSlots: string[] = [];
  const intervalMinutes = 15; // Granularidad de inicio de turnos
  const candidateStarts = generateTimeSlots(intervalMinutes);

  const safeReservations = Array.isArray(existingReservations) ? existingReservations : [];

  // Lógica para filtrar horas pasadas si la fecha es hoy
  const now = new Date();
  const isToday = selectedDate ? (
    selectedDate.getFullYear() === now.getFullYear() &&
    selectedDate.getMonth() === now.getMonth() &&
    selectedDate.getDate() === now.getDate()
  ) : false;

  // Margen de 15 minutos para permitir agendar con antelación mínima
  const currentMinutes = now.getHours() * 60 + now.getMinutes() + 15;

  for (const startTime of candidateStarts) {
    // Si es hoy y la hora ya pasó (o está muy cerca), omitir
    if (isToday) {
      const [h, m] = startTime.split(':').map(Number);
      if (h * 60 + m <= currentMinutes) continue;
    }

    // Calcular fin de la cita hipotética
    const endTime = calculateEndTime(startTime, serviceDuration);

    // Validar el bloque [startTime, endTime] completo contra descansos, jornada y citas
    const check = isSlotAvailable(
      { start: startTime, end: endTime },
      availability,
      safeReservations
    );

    // Solo si el bloque está 100% libre se añade a la lista
    if (check.available) {
      validSlots.push(startTime);
    }
  }

  return validSlots;
}
