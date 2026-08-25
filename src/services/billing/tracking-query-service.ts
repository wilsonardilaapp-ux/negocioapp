'use client';

import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  startAfter,
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';
import type { TrackingEvent } from '@/types/tracking';

/**
 * @fileOverview Servicio de consulta y análisis para eventos de rastreo de ventas.
 * Proporciona capacidades de filtrado, paginación y agregación de métricas de canal.
 */

export interface TrackingFilters {
  startDate?: Date;
  endDate?: Date;
  sellerId?: string;
  source?: string;
  channel?: string;
  limit?: number;
  lastDoc?: any;
}

export interface ChannelShare {
  name: string;
  count: number;
  totalAmount: number;
  percentage: number;
}

export const trackingQueryService = {
  /**
   * Obtiene una lista de eventos de rastreo aplicando filtros opcionales y paginación.
   * Útil para auditoría y visualización de logs de ventas.
   */
  getTrackingEvents: async (businessId: string, filters: TrackingFilters) => {
    const db = getFirestore();
    const colRef = collection(db, `businesses/${businessId}/tracking_events`);
    
    const constraints: QueryConstraint[] = [];
    
    if (filters.startDate) {
      constraints.push(where('createdAt', '>=', Timestamp.fromDate(filters.startDate)));
    }
    if (filters.endDate) {
      constraints.push(where('createdAt', '<=', Timestamp.fromDate(filters.endDate)));
    }
    if (filters.sellerId) {
      constraints.push(where('sellerId', '==', filters.sellerId));
    }
    if (filters.source) {
      constraints.push(where('source', '==', filters.source));
    }
    if (filters.channel) {
      constraints.push(where('channel', '==', filters.channel));
    }
    
    // Ordenamiento predeterminado: más reciente primero
    constraints.push(orderBy('createdAt', 'desc'));
    
    if (filters.limit) {
      constraints.push(limit(filters.limit));
    }
    if (filters.lastDoc) {
      constraints.push(startAfter(filters.lastDoc));
    }

    const q = query(colRef, ...constraints);
    const snapshot = await getDocs(q);
    
    return {
      events: snapshot.docs.map(doc => ({ ...doc.data(), trackingId: doc.id } as TrackingEvent)),
      lastDoc: snapshot.docs[snapshot.docs.length - 1]
    };
  },

  /**
   * Realiza una agregación analítica para determinar la cuota de mercado por canal.
   * Calcula el volumen de pedidos, monto recaudado y el peso porcentual de cada canal.
   */
  getChannelShare: async (businessId: string, startDate: Date, endDate: Date): Promise<ChannelShare[]> => {
    const db = getFirestore();
    const colRef = collection(db, `businesses/${businessId}/tracking_events`);
    
    // Consulta de eventos en el rango especificado
    const q = query(
      colRef,
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      where('createdAt', '<=', Timestamp.fromDate(endDate))
    );
    
    const snapshot = await getDocs(q);
    const events = snapshot.docs.map(doc => doc.data() as TrackingEvent);
    
    const totalsByChannel: Record<string, { count: number; amount: number }> = {};
    let grandTotalAmount = 0;

    // Procesamiento en memoria para mayor flexibilidad sin requerir índices compuestos masivos
    events.forEach(event => {
      const channel = event.channel || 'desconocido';
      if (!totalsByChannel[channel]) {
        totalsByChannel[channel] = { count: 0, amount: 0 };
      }
      totalsByChannel[channel].count += 1;
      totalsByChannel[channel].amount += event.total || 0;
      grandTotalAmount += event.total || 0;
    });

    // Transformación al modelo de visualización (ChannelShare)
    const shares: ChannelShare[] = Object.entries(totalsByChannel).map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
      count: data.count,
      totalAmount: data.amount,
      percentage: grandTotalAmount > 0 ? (data.amount / grandTotalAmount) * 100 : 0
    }));

    // Ordenar por relevancia financiera (monto mayor a menor)
    return shares.sort((a, b) => b.totalAmount - a.totalAmount);
  }
};