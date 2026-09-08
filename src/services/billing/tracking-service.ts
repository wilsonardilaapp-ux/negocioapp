import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, serverTimestamp } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { Invoice } from '@/types/billing';
import type { TrackingEvent } from '@/types/tracking';
import type { Order } from '@/models/order';

/**
 * @fileOverview Servicio de registro de eventos de rastreo para la Terminal POS y Pedidos Públicos.
 * Permite la trazabilidad de ventas para informes de origen de pedidos.
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
    consecutiveNumber: invoice.consecutiveNumber,
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

/**
 * Registra un evento de rastreo para un pedido realizado desde el catálogo público.
 * Mapea los parámetros de referencia (?ref=) a los canales de analíticas correspondientes.
 * Actualizado para soportar el campo origin dinámico de la orden.
 */
export function registerPublicOrderTracking(
  db: Firestore,
  businessId: string,
  order: Order
) {
  if (!db || !businessId || !order) return;

  const trackingColRef = collection(db, `businesses/${businessId}/tracking_events`);
  
  // Mapeo inteligente de orígenes (ref=...) a fuentes y canales oficiales
  // Toma el valor persistido en order.origin
  const origin = order.origin?.toLowerCase() || 'web';
  
  let source: TrackingEvent['source'] = 'catalogo_web';
  let channel: TrackingEvent['channel'] = 'online';

  if (origin === 'whatsapp') {
    source = 'whatsapp_link';
    channel = 'online';
  } else if (origin === 'qr') {
    source = 'qr';
    channel = 'presencial';
  } else if (origin === 'redes' || origin === 'redes_sociales') {
    source = 'qr'; 
    channel = 'redes_sociales';
  } else if (origin === 'facebook') {
    source = 'facebook';
    channel = 'redes_sociales';
  } else if (origin === 'instagram') {
    source = 'instagram';
    channel = 'redes_sociales';
  } else if (origin === 'landing') {
    source = 'catalogo_web';
    channel = 'online';
  } else if (origin === 'blog') {
    source = 'catalogo_web';
    channel = 'online';
  }

  const eventData: Omit<TrackingEvent, 'trackingId'> = {
    businessId,
    source,
    channel,
    invoiceId: null,
    orderId: order.id,
    consecutiveNumber: order.id.slice(-8).toUpperCase(), 
    sellerId: null,
    sellerName: 'Cliente Online',
    customerId: null,
    customerName: order.customerName,
    customerWhatsapp: order.customerPhone || null,
    paymentMethod: order.paymentMethod as any,
    total: order.total,
    createdAt: serverTimestamp(),
  };

  return addDocumentNonBlocking(trackingColRef, eventData);
}
