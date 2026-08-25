import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, serverTimestamp } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { Invoice } from '@/types/billing';
import type { TrackingEvent } from '@/types/tracking';

/**
 * @fileOverview Servicio de registro de eventos de rastreo para la Terminal POS.
 * Permite la trazabilidad de ventas presenciales para informes de origen de pedidos.
 */

/**
 * Registra un evento de rastreo para una venta realizada en la Terminal POS.
 * Se ejecuta de forma asíncrona para no bloquear la UI del cajero.
 */
export function registerPOSTracking(
  db: Firestore, 
  businessId: string, 
  invoice: Invoice, 
  sellerName: string | null
) {
  if (!db || !businessId || !invoice) return;

  const trackingColRef = collection(db, `businesses/${businessId}/tracking_events`);
  
  const eventData: Omit<TrackingEvent, 'trackingId'> = {
    businessId,
    source: 'terminal_pos',
    channel: 'presencial',
    invoiceId: invoice.id,
    orderId: null,
    sellerId: invoice.vendedorId,
    sellerName: sellerName || 'Vendedor POS',
    customerId: invoice.customer.id || null,
    customerName: invoice.customer.name,
    customerWhatsapp: invoice.customer.phone || null,
    paymentMethod: invoice.paymentMethod,
    total: invoice.total,
    createdAt: serverTimestamp(),
  };

  // Ejecución no bloqueante
  return addDocumentNonBlocking(trackingColRef, eventData);
}
