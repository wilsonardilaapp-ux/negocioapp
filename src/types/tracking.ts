/**
 * @fileOverview Definición del modelo de eventos de rastreo de ventas.
 */

export interface TrackingEvent {
  businessId: string;
  trackingId: string;
  /**
   * Identifica el origen exacto del pedido.
   * 'terminal_pos' se usa para ventas físicas procesadas por el cajero.
   */
  source: 'terminal_pos' | 'catalogo_web' | 'whatsapp_link' | 'instagram' | 'facebook' | 'google' | 'qr' | 'reservas';
  /**
   * Categorización de canal para informes de Origen de Pedidos.
   */
  channel: 'presencial' | 'online' | 'redes_sociales' | 'directo';
  invoiceId: string | null;
  orderId: string | null;
  consecutiveNumber?: string | null; // Añadido para trazabilidad en reportes
  sellerId: string | null;
  sellerName: string | null;
  customerId: string | null;
  customerName: string | null;
  customerWhatsapp: string | null;
  paymentMethod: string | null;
  total: number;
  createdAt: any; // Timestamp de Firestore
}
