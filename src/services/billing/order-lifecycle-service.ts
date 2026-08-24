'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import { FieldValue } from 'firebase-admin/firestore';
import type { Invoice, VerticalType } from '@/types/billing';

/**
 * @fileOverview Servicio de gestión del ciclo de vida de órdenes y facturas.
 * Centraliza las transiciones de estado y la sincronización entre colecciones (invoices <-> orders).
 */

/**
 * Actualiza el estado de una factura y sincroniza el documento espejo en 'orders'.
 * Garantiza consistencia para el Tablero Kanban.
 */
export async function updateInvoiceOperation(
  businessId: string,
  invoiceId: string,
  updates: {
    status?: 'completada' | 'anulada';
    orderStatus?: 'pendiente' | 'completado';
    atendidoPor?: string;
  }
) {
  const db = await getAdminFirestore();
  const invoiceRef = db.collection('businesses').doc(businessId).collection('invoices').doc(invoiceId);
  const orderRef = db.collection('businesses').doc(businessId).collection('orders').doc(invoiceId);

  try {
    await db.runTransaction(async (transaction) => {
      const invSnap = await transaction.get(invoiceRef);
      if (!invSnap.exists) throw new Error("La factura no existe.");
      
      const invData = invSnap.data() as Invoice;

      // REGLA DE BLOQUEO: No permitir cambios operativos si la factura está anulada
      if (invData.status === 'anulada' && updates.status !== 'completada') {
        throw new Error("No se pueden realizar cambios en una factura anulada.");
      }

      const now = new Date().toISOString();
      const finalUpdates = { ...updates, updatedAt: now };

      // 1. Actualizar Factura
      transaction.update(invoiceRef, finalUpdates);

      // 2. Sincronizar Pedido (si existe)
      const orderSnap = await transaction.get(orderRef);
      if (orderSnap.exists) {
        const orderUpdates: any = {};
        if (updates.orderStatus) orderUpdates.orderStatus = updates.orderStatus === 'completado' ? 'Entregado' : 'Pendiente';
        if (updates.status === 'anulada') orderUpdates.orderStatus = 'Cancelado';
        if (updates.atendidoPor) orderUpdates.atendidoPor = updates.atendidoPor;
        
        if (Object.keys(orderUpdates).length > 0) {
          transaction.update(orderRef, { ...orderUpdates, updatedAt: now });
        }
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error("[OrderLifecycle] Error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Anulación de factura con reversión de inventario y cancelación de orden.
 */
export async function voidInvoiceAndRevertStock(
  businessId: string,
  invoiceId: string,
  userId: string
) {
  const db = await getAdminFirestore();
  const invoiceRef = db.collection('businesses').doc(businessId).collection('invoices').doc(invoiceId);
  const orderRef = db.collection('businesses').doc(businessId).collection('orders').doc(invoiceId);

  try {
    await db.runTransaction(async (transaction) => {
      const invSnap = await transaction.get(invoiceRef);
      if (!invSnap.exists) throw new Error("La factura no existe.");
      const invData = invSnap.data() as Invoice;

      if (invData.status === 'anulada') throw new Error("La factura ya está anulada.");

      const now = new Date().toISOString();

      // 1. Anular Factura
      transaction.update(invoiceRef, { status: 'anulada', updatedAt: now });

      // 2. Cancelar Orden espejo
      const orderSnap = await transaction.get(orderRef);
      if (orderSnap.exists) {
        transaction.update(orderRef, { orderStatus: 'Cancelado', updatedAt: now });
      }

      // 3. Revertir Stock
      for (const item of invData.items) {
        const productRef = db.collection('businesses').doc(businessId).collection('products').doc(item.productId);
        transaction.update(productRef, { stock: FieldValue.increment(item.quantity) });

        const movementRef = db.collection('businesses').doc(businessId).collection('stock_movements').doc();
        transaction.set(movementRef, {
          productId: item.productId,
          productName: item.name,
          type: 'void_reversal',
          change: item.quantity,
          referenceId: invoiceId,
          consecutive: invData.consecutiveNumber,
          createdAt: now,
          userId: userId
        });
      }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
