/**
 * @fileOverview Orquestador de señales para el Motor de Oportunidades Diarias.
 * Consolida datos de Churn, Confirmaciones, Capacidad y Fidelización.
 */

import { BookingChurnService, type BookingOpportunity } from './booking-churn';
import type { Reservation, BookingAvailability } from '@/models/booking';
import type { LoyaltyBalance } from './loyalty-service';

export type OpportunityType = 'churn' | 'confirmation' | 'empty_slot' | 'vip';
export type OpportunityPriority = 'critical' | 'high' | 'medium' | 'info';

export interface DailyOpportunity {
  id: string;
  type: OpportunityType;
  priority: OpportunityPriority;
  title: string;
  description: string;
  customerName?: string;
  customerPhone?: string;
  reservationId?: string;
  estimatedRevenue?: number;
  timeLabel?: string;
  data?: any;
}

export class BookingDailyOpportunitiesService {
  /**
   * Genera el feed de oportunidades para el día de hoy.
   */
  static getDailyOpportunitiesFeed(
    reservations: Reservation[],
    balances: LoyaltyBalance[],
    availability: BookingAvailability[],
    businessId: string
  ): DailyOpportunity[] {
    const opportunities: DailyOpportunity[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    // --- 1. SEÑAL 🔴: CHURN CRÍTICO (Fase 9) ---
    const { opportunities: churnList } = BookingChurnService.getBookingOpportunities(reservations);
    churnList.filter(o => o.riskLevel === 'critical' || o.riskLevel === 'overdue').forEach(o => {
      opportunities.push({
        id: `churn-${o.customerPhone}`,
        type: 'churn',
        priority: o.riskLevel === 'critical' ? 'critical' : 'high',
        title: o.riskLevel === 'critical' ? 'Riesgo Crítico de Abandono' : 'Cliente por Re-agendar',
        description: `${o.customerName} no nos visita hace ${o.daysSinceLastVisit} días. Su ciclo habitual es de ${o.averageIntervalDays} días.`,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        estimatedRevenue: o.estimatedValue,
        data: o
      });
    });

    // --- 2. SEÑAL 🟠: CONFIRMACIONES PENDIENTES (Fase 7) ---
    // Citas para hoy o mañana que siguen en 'pending'
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    reservations
      .filter(r => (r.date === todayStr || r.date === tomorrowStr) && r.status === 'pending')
      .forEach(r => {
        opportunities.push({
          id: `conf-${r.id}`,
          type: 'confirmation',
          priority: 'high',
          title: 'Confirmación Pendiente',
          description: `Cita de ${r.customerName} para el ${r.date === todayStr ? 'hoy' : 'mañana'} a las ${r.startTime}.`,
          customerName: r.customerName,
          customerPhone: r.customerPhone,
          reservationId: r.id,
          timeLabel: r.startTime,
          estimatedRevenue: r.price,
          data: r
        });
      });

    // --- 3. SEÑAL ⭐: HITOS VIP (Fase 8) ---
    // Clientes que alcanzaron 5, 10, 20 visitas
    balances.filter(b => b.visitCount > 0 && b.visitCount % 5 === 0).forEach(b => {
      opportunities.push({
        id: `vip-${b.whatsapp}`,
        type: 'vip',
        priority: 'medium',
        title: 'Hito de Fidelización',
        description: `¡${b.name || 'El cliente'} ha completado ${b.visitCount} visitas! Es un buen momento para premiar su lealtad.`,
        customerName: b.name,
        customerPhone: b.whatsapp,
        data: b
      });
    });

    // --- 4. SEÑAL 🟢: HUECOS EN HORA PICO (Heurística Fase 11) ---
    // Si hoy es un día abierto y hay franjas de alta demanda vacías
    const dayOfWeek = new Date().getDay();
    const todayAvail = availability.find(a => a.dayOfWeek === dayOfWeek);
    
    if (todayAvail?.isOpen) {
        // Horas pico habituales: 10:00, 16:00, 17:00 (Simulado por ahora hasta tener agregación persistida)
        const peakHours = ['10:00', '16:00', '17:00'];
        peakHours.forEach(hour => {
            const isOccupied = reservations.some(r => r.date === todayStr && r.startTime === hour && r.status !== 'cancelled');
            if (!isOccupied) {
                opportunities.push({
                    id: `slot-${todayStr}-${hour}`,
                    type: 'empty_slot',
                    priority: 'medium',
                    title: 'Hora Pico Disponible',
                    description: `Tienes un espacio libre hoy a las ${hour}. Es una franja de alta demanda.`,
                    timeLabel: hour
                });
            }
        });
    }

    // Ordenar: Críticos primero, luego por ingresos potenciales
    return opportunities.sort((a, b) => {
        const priorityMap = { critical: 0, high: 1, medium: 2, info: 3 };
        const pA = priorityMap[a.priority as keyof typeof priorityMap] ?? 3;
        const pB = priorityMap[b.priority as keyof typeof priorityMap] ?? 3;
        if (pA !== pB) {
            return pA - pB;
        }
        return (b.estimatedRevenue || 0) - (a.estimatedRevenue || 0);
    });
  }
}
