import type { AppliedPromotion } from './cart';

export type OrderStatus = "Pendiente" | "En proceso" | "Enviado" | "Entregado" | "Cancelado";

export type TipoEntrega = 'domicilio' | 'recoger_en_tienda';

/**
 * Modelo legado para compatibilidad con pedidos individuales creados anteriormente.
 * Representa un solo producto por documento.
 */
export type OrderLegacy = {
    id: string;
    businessId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerAddress: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number; 
    paymentMethod: string;
    orderDate: string;
    orderStatus: OrderStatus;
    packagingCost?: number;
    tipoEntrega: TipoEntrega;
};

/**
 * Representa un ítem individual dentro de un pedido agrupado.
 */
export type OrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  appliedPromotion?: AppliedPromotion;
};

/**
 * Modelo de pedido completo (Transaccional).
 * Agrupa múltiples ítems y detalla los costos finales de la operación.
 * Se utiliza para registrar una transacción completa del cliente en un solo documento.
 */
export type Order = {
  id: string;
  businessId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;       // El monto total de descuento aplicado (cupón o promoción de orden)
  discountLabel: string;        // Etiqueta descriptiva: "Cupón (CODIGO)" o "Descuento por cantidad"
  packagingCost: number;        // Suma total de costos de empaque de todos los ítems
  deliveryFee: number;          // Costo de envío según configuración del negocio
  vatAmount: number;            // Monto calculado del IVA
  total: number;                // Valor neto final a pagar por el cliente
  paymentMethod: string;
  orderDate: string;
  orderStatus: OrderStatus;
  tipoEntrega: TipoEntrega;
};
