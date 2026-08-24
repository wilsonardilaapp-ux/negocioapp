/**
 * @fileOverview Definiciones de tipos para el módulo de Facturación (POS).
 * Soporta múltiples verticales (Restaurante, Belleza, Retail, Servicios).
 */

export type VerticalType = 'Restaurante' | 'Belleza' | 'Retail' | 'Servicios';
export type DiscountType = 'amount' | 'percent';

export interface POSItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
}

export interface Invoice {
  id: string;
  consecutiveNumber: string; // Ej: POS-0001
  createdAt: string;
  businessId: string;
  vendedorId: string;
  customer: {
    id?: string;
    name: string;
    document?: string;
    email?: string;
    phone?: string;
  };
  items: POSItem[];
  subtotal: number;
  tax: number;      // IVA calculado
  discount: number; // Descuento global
  tip: number;      // Propina (Opcional)
  total: number;
  paymentMethod: 'efectivo' | 'nequi' | 'bancolombia' | 'tarjeta' | 'otros';
  cashReceived: number;
  changeAmount: number;
  status: 'completada' | 'anulada' | 'borrador';
  
  // Campos Condicionales (Multi-Vertical)
  mesa?: string;
  pax?: number;
  atendidoPor?: string; // Mesero / Estilista
  tipoConsumo?: 'local' | 'llevar' | 'domicilio';
}

export const VERTICAL_LABELS: Record<VerticalType, { staff: string; location: string }> = {
  'Restaurante': { staff: 'Mesero', location: 'Mesa' },
  'Belleza': { staff: 'Estilista', location: 'Silla/Cabina' },
  'Retail': { staff: 'Vendedor', location: 'Bodega' },
  'Servicios': { staff: 'Especialista', location: 'Sede' }
};
