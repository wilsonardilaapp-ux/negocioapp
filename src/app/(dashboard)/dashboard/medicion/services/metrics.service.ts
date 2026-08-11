/**
 * @fileOverview Servicio encargado del procesamiento de datos analíticos.
 */

import type { Order } from '@/models/order';
import { calculateGrowth } from '../utils/metrics-utils';
import type { MetricAnalysis, DataPoint } from '../types/metrics.types';
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

    const history = this.generateCountHistory(currentPeriodOrders, start, end);

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

    const history = eachDayOfInterval({ start, end }).map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayOrders = currentPeriod.filter(o => format(new Date(o.orderDate), 'yyyy-MM-dd') === dayStr);
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
   * Analiza la adquisición de clientes nuevos.
   */
  static analyzeNewClients(orders: Order[], days: number = 30): MetricAnalysis {
    const end = new Date();
    const start = startOfDay(subDays(end, days));
    const prevStart = startOfDay(subDays(start, days));

    const firstOrdersMap = new Map<string, Date>();
    orders.forEach(o => {
      const date = new Date(o.orderDate);
      const currentFirst = firstOrdersMap.get(o.customerEmail);
      if (!currentFirst || date < currentFirst) {
        firstOrdersMap.set(o.customerEmail, date);
      }
    });

    const newClientsCurrent = Array.from(firstOrdersMap.values()).filter(date => 
      isWithinInterval(date, { start, end })
    ).length;

    const newClientsPrev = Array.from(firstOrdersMap.values()).filter(date => 
      isWithinInterval(date, { start: prevStart, end: start })
    ).length;

    const history = eachDayOfInterval({ start, end }).map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const count = Array.from(firstOrdersMap.values()).filter(date => 
        format(date, 'yyyy-MM-dd') === dayStr
      ).length;
      return {
        date: format(day, 'dd MMM', { locale: es }),
        value: count
      };
    });

    return {
      title: 'Clientes Nuevos',
      currentValue: newClientsCurrent,
      previousValue: newClientsPrev,
      growth: calculateGrowth(newClientsCurrent, newClientsPrev),
      history,
    };
  }

  /**
   * Analiza la retención de clientes recurrentes.
   */
  static analyzeRetention(orders: Order[], days: number = 30): MetricAnalysis {
    const end = new Date();
    const start = startOfDay(subDays(end, days));
    const prevStart = startOfDay(subDays(start, days));

    const getRetentionStats = (periodStart: Date, periodEnd: Date) => {
      const periodOrders = orders.filter(o => isWithinInterval(new Date(o.orderDate), { start: periodStart, end: periodEnd }));
      const customerCounts = new Map<string, number>();
      periodOrders.forEach(o => customerCounts.set(o.customerEmail, (customerCounts.get(o.customerEmail) || 0) + 1));
      
      const totalCustomers = customerCounts.size;
      const returningCustomers = Array.from(customerCounts.values()).filter(count => count > 1).length;
      
      return totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;
    };

    const currentRetention = getRetentionStats(start, end);
    const prevRetention = getRetentionStats(prevStart, start);

    const history = eachDayOfInterval({ start, end }).map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayOrders = orders.filter(o => format(new Date(o.orderDate), 'yyyy-MM-dd') === dayStr);
      const customerCounts = new Map<string, number>();
      dayOrders.forEach(o => customerCounts.set(o.customerEmail, (customerCounts.get(o.customerEmail) || 0) + 1));
      
      const total = customerCounts.size;
      const returning = Array.from(customerCounts.values()).filter(count => count > 1).length;
      
      return {
        date: format(day, 'dd MMM', { locale: es }),
        value: total > 0 ? Math.round((returning / total) * 100) : 0
      };
    });

    return {
      title: 'Tasa de Retención',
      currentValue: Math.round(currentRetention),
      previousValue: Math.round(prevRetention),
      growth: calculateGrowth(currentRetention, prevRetention),
      history,
    };
  }

  /**
   * Analiza la distribución de pedidos por canal.
   */
  static analyzeOrdersByChannel(orders: Order[], days: number = 30) {
    const end = new Date();
    const start = startOfDay(subDays(end, days));

    const currentPeriodOrders = orders.filter(o => {
      const date = new Date(o.orderDate);
      return isWithinInterval(date, { start, end });
    });

    const channelCounts: Record<string, number> = {};
    
    currentPeriodOrders.forEach(order => {
      // Fallback a "Web/Catálogo" si no existe metadata de origen
      const channel = order.origin || 'web';
      channelCounts[channel] = (channelCounts[channel] || 0) + 1;
    });

    // Mapeo amigable para el gráfico
    const channelLabels: Record<string, string> = {
      'qr': 'Código QR (Mesa/Local)',
      'whatsapp': 'Link WhatsApp',
      'web': 'Catálogo Web',
      'link': 'Link Directo',
    };

    return Object.entries(channelCounts).map(([id, count]) => ({
      name: channelLabels[id] || id.toUpperCase(),
      value: count,
    }));
  }

  private static generateCountHistory(periodOrders: Order[], start: Date, end: Date): DataPoint[] {
    return eachDayOfInterval({ start, end }).map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const count = periodOrders.filter(o => format(new Date(o.orderDate), 'yyyy-MM-dd') === dayStr).length;
      return {
        date: format(day, 'dd MMM', { locale: es }),
        value: count,
      };
    });
  }
}
