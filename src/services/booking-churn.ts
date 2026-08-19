
'use client';

/**
 * @fileOverview Motor de análisis de Churn y Oportunidades para Reservas.
 * Calcula frecuencias de visita y niveles de riesgo por cliente.
 */

import type { Reservation } from '@/models/booking';
import { differenceInDays } from 'date-fns';

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
   * Procesa un listado de reservas para detectar oportunidades de re-agendamiento.
   * Filtra las citas completadas y calcula la frecuencia de cada cliente.
   */
  static getBookingOpportunities(reservations: Reservation[]): {
    opportunities: BookingOpportunity[];
    metrics: ChurnMetrics;
  } {
    const today = new Date();
    const customerMap = new Map<string, Reservation[]>();

    // 1. Agrupar por teléfono de cliente todas las citas atendidas exitosamente
    reservations.forEach((res) => {
      // Consideramos tanto completed como confirmed para visibilidad de clientes activos
      if (res.status !== 'completed' && res.status !== 'confirmed') return;
      
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

    // 2. Analizar el comportamiento histórico de cada cliente
    customerMap.forEach((userRes, phone) => {
      // Ordenar por fecha descendente para identificar la última visita
      const sortedRes = [...userRes].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      const latest = sortedRes[0];
      const oldest = sortedRes[sortedRes.length - 1];
      const visitCount = sortedRes.length;
      
      // Cálculo de inactividad ignorando desfases de hora
      const lastVisitDate = new Date(latest.date + 'T00:00:00');
      const daysSinceLastVisit = Math.abs(differenceInDays(today, lastVisitDate));

      // Determinar frecuencia habitual del cliente (intervalo promedio entre visitas)
      let averageIntervalDays = 30; // 1 mes como base de referencia si solo hay una visita
      
      if (visitCount > 1) {
        const totalDaysRange = Math.abs(differenceInDays(
          new Date(latest.date + 'T00:00:00'),
          new Date(oldest.date + 'T00:00:00')
        ));
        // Frecuencia real: días totales / (visitas - 1)
        averageIntervalDays = Math.max(7, Math.round(totalDaysRange / (visitCount - 1)));
      }

      // Clasificación de Riesgo según frecuencia habitual
      let riskLevel: RiskLevel = 'normal';
      
      // ALTO RIESGO: Si ha pasado más del 150% de su tiempo habitual sin volver
      if (daysSinceLastVisit > averageIntervalDays * 1.5) {
        riskLevel = 'critical';
        metrics.criticalCount++;
      } 
      // ATRASADO: Si superó su ciclo promedio pero aún está en ventana de recuperación corta
      else if (daysSinceLastVisit > averageIntervalDays) {
        riskLevel = 'overdue';
        metrics.overdueCount++;
      } 
      // OPORTUNIDAD: Se acerca a su fecha de re-agendamiento (ventana del 80%)
      else if (daysSinceLastVisit >= averageIntervalDays * 0.8) {
        riskLevel = 'upcoming';
        metrics.upcomingCount++;
      }

      if (riskLevel !== 'normal') {
        const estimatedValue = latest.price || 0;
        
        // Solo sumamos ingresos perdidos para clientes críticos o atrasados
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
          lastServiceName: latest.serviceName || latest.serviceId,
          lastServiceId: latest.serviceId,
          lastStaffName: latest.staffName || 'Cualquiera',
        });
      }
    });

    // Ordenamiento por prioridad operativa
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
