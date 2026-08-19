'use client';

/**
 * @fileOverview Motor de análisis de Churn y Oportunidades para Reservas.
 * Calcula frecuencias de visita y niveles de riesgo por cliente.
 * Optimizado para incluir a toda la base analizada y evitar fallos de parseo.
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

/**
 * Función auxiliar para parsear fechas de forma segura evitando desfases UTC y NaN.
 */
const parseSafeDate = (dateVal: string | undefined | null): Date => {
  if (!dateVal) return new Date();
  try {
    // Si ya contiene T, es ISO completo. Si no, forzamos inicio de día local.
    const dateStr = dateVal.includes('T') ? dateVal : `${dateVal}T00:00:00`;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  } catch {
    return new Date();
  }
};

export class BookingChurnService {
  /**
   * Procesa un listado de reservas para detectar oportunidades de re-agendamiento.
   * Analiza el comportamiento histórico e incluye a toda la base para filtrado dinámico.
   */
  static getBookingOpportunities(reservations: Reservation[]): {
    opportunities: BookingOpportunity[];
    metrics: ChurnMetrics;
  } {
    const today = new Date();
    const customerMap = new Map<string, Reservation[]>();

    // 1. Agrupar por teléfono de cliente
    reservations.forEach((res) => {
      // Normalización insensible a mayúsculas
      const status = String(res.status || '').toLowerCase();
      
      // Consideramos tanto completed como confirmed para visibilidad de clientes activos
      if (status !== 'completed' && status !== 'confirmed') return;
      
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
      
      // Cálculo de inactividad con parseo seguro
      const lastVisitDate = parseSafeDate(latest.date);
      const daysSinceLastVisit = Math.max(0, differenceInDays(today, lastVisitDate));

      // Determinar frecuencia habitual del cliente (intervalo promedio entre visitas)
      let averageIntervalDays = 30; // Base de referencia
      
      if (visitCount > 1) {
        const oldestDate = parseSafeDate(oldest.date);
        const totalDaysRange = Math.abs(differenceInDays(lastVisitDate, oldestDate));
        // Frecuencia real: días totales / (visitas - 1)
        averageIntervalDays = Math.max(7, Math.round(totalDaysRange / (visitCount - 1)));
      }

      // Clasificación de Riesgo según frecuencia habitual
      let riskLevel: RiskLevel = 'normal';
      
      // ALTO RIESGO: Si ha pasado más del 150% de su tiempo habitual sin volver
      if (daysSinceLastVisit > averageIntervalDays * 1.5) {
        riskLevel = 'critical';
        metrics.criticalCount++;
        metrics.totalAtRiskRevenue += latest.price || 0;
      } 
      // ATRASADO: Si superó su ciclo promedio pero aún está en ventana de recuperación corta
      else if (daysSinceLastVisit > averageIntervalDays) {
        riskLevel = 'overdue';
        metrics.overdueCount++;
        metrics.totalAtRiskRevenue += latest.price || 0;
      } 
      // OPORTUNIDAD: Se acerca a su fecha de re-agendamiento (ventana del 80%)
      else if (daysSinceLastVisit >= averageIntervalDays * 0.8) {
        riskLevel = 'upcoming';
        metrics.upcomingCount++;
      }

      // INCLUSIÓN TOTAL: Agregamos a todos los clientes a la lista final
      // Esto permite que el buscador y el filtro "Todos" de la UI funcionen correctamente
      opportunities.push({
        customerPhone: phone,
        customerName: latest.customerName,
        visitCount,
        lastVisitAt: latest.date,
        daysSinceLastVisit,
        averageIntervalDays,
        riskLevel,
        estimatedValue: latest.price || 0,
        lastServiceName: latest.serviceName || latest.serviceId,
        lastServiceId: latest.serviceId,
        lastStaffName: latest.staffName || 'Cualquiera',
      });
    });

    // Ordenamiento por prioridad operativa: Críticos arriba, luego por valor
    const sortedOpportunities = opportunities.sort((a, b) => {
      const riskOrder: Record<RiskLevel, number> = { critical: 0, overdue: 1, upcoming: 2, normal: 3 };
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