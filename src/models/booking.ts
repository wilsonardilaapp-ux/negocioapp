/**
 * @fileOverview Modelos de datos para el sistema de Reservas y Agendamiento.
 */

export type ReservationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface BookingService {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  category?: string;
  isActive: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface BookingStaff {
  id: string;
  name: string;
  specialty?: string;
  assignedServiceIds: string[];
  isActive: boolean;
  phone?: string;
  createdAt: string; // ISO 8601
}

export interface TimeRange {
  start: string; // HH:mm (24h)
  end: string;   // HH:mm (24h)
}

export interface BookingAvailability {
  dayOfWeek: number; // 0-6 (Domingo-Sábado)
  isOpen: boolean;
  shifts: TimeRange[];
  breaks?: TimeRange[];
}

export interface RescheduleHistory {
  previousDate: string;
  previousStartTime: string;
  previousEndTime: string;
  rescheduledAt: string;
}

export interface Reservation {
  id: string;
  businessId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceId: string;
  staffId?: string;
  date: string;      // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  status: ReservationStatus;
  price: number;
  notes?: string;
  source: 'web' | 'admin';
  loyaltyPointsGranted?: boolean; // Integración con módulo de fidelización
  cancellationReason?: string;
  rescheduleHistory?: RescheduleHistory[];
  reminderSentAt?: string; // Marca de tiempo del último recordatorio manual enviado (Fase 7)
  createdAt: string;
  updatedAt: string;
}

/**
 * Calcula la hora de finalización de una cita basándose en la hora de inicio y duración.
 * @param startTime Hora de inicio en formato HH:mm
 * @param durationMinutes Duración en minutos
 * @returns Hora de fin en formato HH:mm
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  
  const endDate = new Date(date.getTime() + durationMinutes * 60000);
  
  const endHours = String(endDate.getHours()).padStart(2, '0');
  const endMinutes = String(endDate.getMinutes()).padStart(2, '0');
  
  return `${endHours}:${endMinutes}`;
}
