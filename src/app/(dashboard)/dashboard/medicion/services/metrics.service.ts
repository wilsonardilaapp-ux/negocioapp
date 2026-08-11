/**
 * @fileOverview Servicio encargado del procesamiento de datos analíticos.
 */

import type { Order } from '@/models/order';
import { calculateGrowth } from '../utils/metrics-utils';
import type { MetricAnalysis, DataPoint, TimeRange } from '../types/metrics.types';
import { startOfDay, subDays, format, isWithinInterval, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

export class MetricsService {
  /**
   * Calcula el análisis de número de pedidos.
   */
  static analyzeOrdersCount(orders: Order[], days: number = 30): MetricAnalysis {
    const end = new Date();
    const start = startOfDay(subDays(end, days));
    const prevStart = startOfDay(subDays(start, days));

    const currentPeriodOrders = orders.filter(o => {
      const date = new Date(o.orderDate);
      return isWithinInterval(date, { start, end });
    });

    const previousPeriodOrders = orders.filter(o => {
      const date = new Date(o.orderDate);
      return isWithinInterval(date, { start: prevStart, end: start });
    });

    const history = this.generateHistory(currentPeriodOrders, start, end);

    return {
      title: 'Número de Pedidos',
      currentValue: currentPeriodOrders.length,
      previousValue: previousPeriodOrders.length,
      growth: calculateGrowth(currentPeriodOrders.length, previousPeriodOrders.length),
      history,
    };
  }

  /**
   * Calcula el análisis del ticket promedio.
   */
  static analyzeAverageTicket(orders: Order[], days: number = 30): MetricAnalysis {
    const end = new Date();
    const start = startOfDay(subDays(end, days));
    const prevStart = startOfDay(subDays(start, days));

    const currentPeriod = orders.filter(o => isWithinInterval(new Date(o.orderDate), { start, end }));
    const prevPeriod = orders.filter(o => isWithinInterval(new Date(o.orderDate), { start: prevStart, end: start }));

    const currentAvg = currentPeriod.length > 0 
      ? currentPeriod.reduce((sum, o) => sum + (o.total || o.subtotal), 0) / currentPeriod.length 
      : 0;
      
    const prevAvg = prevPeriod.length > 0 
      ? prevPeriod.reduce((sum, o) => sum + (o.total || o.subtotal), 0) / prevPeriod.length 
      : 0;

    // Generar historial de promedios diarios
    const history = eachDayOfInterval({ start, end }).map(day => {
      const dayOrders = currentPeriod.filter(o => format(new Date(o.orderDate), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'));
      const avg = dayOrders.length > 0 
        ? dayOrders.reduce((sum, o) => sum + (o.total || o.subtotal), 0) / dayOrders.length 
        : 0;
      return {
        date: format(day, 'dd MMM', { locale: es }),
        value: Math.round(avg)
      };
    });

    return {
      title: 'Ticket Promedio',
      currentValue: Math.round(currentAvg),
      previousValue: Math.round(prevAvg),
      growth: calculateGrowth(currentAvg, prevAvg),
      history,
    };
  }

  /**
   * Helper para generar puntos de datos históricos diarios.
   */
  private static generateHistory(periodOrders: Order[], start: Date, end: Date): DataPoint[] {
    const days = eachDayOfInterval({ start, end });
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const count = periodOrders.filter(o => format(new Date(o.orderDate), 'yyyy-MM-dd') === dayStr).length;
      
      return {
        date: format(day, 'dd MMM', { locale: es }),
        value: count,
      };
    });
  }
}
