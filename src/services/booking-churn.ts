'use client';

/**
 * @fileOverview Motor de análisis de Churn y Oportunidades para Reservas.
 * Calcula frecuencias de visita y niveles de riesgo por cliente.
 */

import type { Reservation } from '@/models/booking';
import { differenceInDays, parseISO } from 'date-fns';

export type RiskLevel = 'critical' | 'overdue' | 'upcoming' | 'normal';

export interface BookingOpportunity {
  customerPhone: string;
  customerName: string;
  visitCount: number;
  lastVisitAt: string;
  daysSinceLastVisit: number;
  averageIntervalDays: number;
  riskLevel: RiskLevel;
  estimatedValue: number;
  lastServiceName: string;
  lastStaffName: string;
  lastServiceId: string;
}

export interface ChurnMetrics {
  criticalCount: number;
  overdueCount: number;
  upcomingCount: number;
  totalAtRiskRevenue: number;
  totalOpportunities: number;
}

export class BookingChurnService {
  /**
   * Procesa un listado de reservas completadas para detectar oportunidades de re-agendamiento.
   */
  static getBookingOpportunities(reservations: Reservation[]): {
    opportunities: BookingOpportunity[];
    metrics: ChurnMetrics;
  } {
    const today = new Date();
    const customerMap = new Map<string, Reservation[]>();

    // 1. Agrupar por teléfono de cliente
    reservations.forEach((res) => {
      if (res.status !== 'completed') return;
      const phone = res.customerPhone;
      if (!customerMap.has(phone)) {
        customerMap.set(phone, []);
      }
      customerMap.get(phone)!.push(res);
    });

    const opportunities: BookingOpportunity[] = [];
    const metrics: ChurnMetrics = {
      criticalCount: 0,
      overdueCount: 0,
      upcomingCount: 0,
      totalAtRiskRevenue: 0,
      totalOpportunities: 0,
    };

    // 2. Analizar cada cliente
    customerMap.forEach((userRes, phone) => {
      // Ordenar por fecha descendente (más reciente primero)
      const sortedRes = [...userRes].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      const latest = sortedRes[0];
      const oldest = sortedRes[sortedRes.length - 1];
      const visitCount = sortedRes.length;
      
      const lastVisitDate = new Date(latest.date + 'T00:00:00');
      const daysSinceLastVisit = Math.abs(differenceInDays(today, lastVisitDate));

      // Calcular intervalo promedio
      let averageIntervalDays = 30; // Fallback 1 mes
      
      if (visitCount > 1) {
        const totalDaysRange = Math.abs(differenceInDays(
          new Date(latest.date + 'T00:00:00'),
          new Date(oldest.date + 'T00:00:00')
        ));
        averageIntervalDays = Math.max(7, Math.round(totalDaysRange / (visitCount - 1)));
      }

      // Determinar Nivel de Riesgo
      let riskLevel: RiskLevel = 'normal';
      
      if (daysSinceLastVisit > averageIntervalDays * 1.5) {
        riskLevel = 'critical';
        metrics.criticalCount++;
      } else if (daysSinceLastVisit > averageIntervalDays) {
        riskLevel = 'overdue';
        metrics.overdueCount++;
      } else if (daysSinceLastVisit >= averageIntervalDays * 0.8) {
        riskLevel = 'upcoming';
        metrics.upcomingCount++;
      }

      if (riskLevel !== 'normal') {
        const estimatedValue = latest.price || 0;
        if (riskLevel !== 'upcoming') {
          metrics.totalAtRiskRevenue += estimatedValue;
        }

        opportunities.push({
          customerPhone: phone,
          customerName: latest.customerName,
          visitCount,
          lastVisitAt: latest.date,
          daysSinceLastVisit,
          averageIntervalDays,
          riskLevel,
          estimatedValue,
          lastServiceName: latest.serviceId, // En el futuro resolveremos el ID al nombre real si es necesario
          lastServiceId: latest.serviceId,
          lastStaffName: latest.staffId || 'Cualquiera',
        });
      }
    });

    // Ordenar: primero los críticos, luego los más caros
    const sortedOpportunities = opportunities.sort((a, b) => {
      const riskOrder = { critical: 0, overdue: 1, upcoming: 2, normal: 3 };
      if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
        return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      }
      return b.estimatedValue - a.estimatedValue;
    });

    metrics.totalOpportunities = opportunities.length;

    return {
      opportunities: sortedOpportunities,
      metrics,
    };
  }
}
