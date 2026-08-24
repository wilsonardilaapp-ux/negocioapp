import { Firestore, runTransaction, doc, collection, increment } from 'firebase/firestore';
import type { Invoice, VerticalType } from '@/types/billing';
import type { Product } from '@/models/product';

/**
 * @fileOverview Servicio de persistencia para la Terminal POS.
 * Ejecuta transacciones atómicas para garantizar la integridad del stock y consecutivos.
 */

export async function processSale(
  db: Firestore,
  businessId: string,
  userId: string,
  invoiceData: Omit<Invoice, 'id' | 'consecutiveNumber' | 'createdAt' | 'status'>,
  businessType: VerticalType
) {
  return await runTransaction(db, async (transaction) => {
    // 1. Lectura de stock y validación de integridad
    for (const item of invoiceData.items) {
      const productRef = doc(db, `businesses/${businessId}/products`, item.productId);
      const productSnap = await transaction.get(productRef);
      
      if (!productSnap.exists()) {
        throw new Error(`El producto "${item.name}" ya no existe en el catálogo.`);
      }

      const productData = productSnap.data() as Product;
      
      // Validar stock si el producto tiene stock controlado (no es null/undefined)
      if (productData.stock !== null && productData.stock !== undefined) {
        if (productData.stock < item.quantity) {
          throw new Error(`Stock insuficiente para "${item.name}". Disponible: ${productData.stock}`);
        }
        
        // Descuento automático de cantidades en el maestro de productos
        transaction.update(productRef, {
          stock: increment(-item.quantity)
        });
      }
    }

    // 2. Generación de Consecutivo Atómico
    const counterRef = doc(db, `businesses/${businessId}/counters`, 'invoices');
    const counterSnap = await transaction.get(counterRef);
    let nextNumber = 1;
    
    if (counterSnap.exists()) {
      nextNumber = (counterSnap.data().current || 0) + 1;
    }
    
    transaction.set(counterRef, { current: nextNumber }, { merge: true });

    const consecutiveStr = `POS-${String(nextNumber).padStart(4, '0')}`;
    const invoiceId = doc(collection(db, 'placeholder')).id;
    const now = new Date().toISOString();

    // 3. Registro de Factura
    const invoiceRef = doc(db, `businesses/${businessId}/invoices`, invoiceId);
    const finalInvoice: Invoice = {
      ...invoiceData,
      id: invoiceId,
      consecutiveNumber: consecutiveStr,
      createdAt: now,
      status: 'completada'
    };
    transaction.set(invoiceRef, finalInvoice);

    // 4. Registro de Trazabilidad en Kardex (stock_movements)
    for (const item of invoiceData.items) {
      const movementRef = doc(collection(db, `businesses/${businessId}/stock_movements`));
      transaction.set(movementRef, {
        productId: item.productId,
        productName: item.name,
        type: 'sale',
        change: -item.quantity,
        referenceId: invoiceId,
        consecutive: consecutiveStr,
        createdAt: now,
        userId: userId
      });
    }

    // 5. Espejo en Órdenes (Comanda para cocina/barra si es Restaurante)
    if (businessType === 'Restaurante') {
        const orderRef = doc(db, `businesses/${businessId}/orders`, invoiceId);
        transaction.set(orderRef, {
            id: invoiceId,
            businessId,
            customerName: invoiceData.customer.name,
            customerEmail: invoiceData.customer.email || '',
            customerPhone: invoiceData.customer.phone || '',
            customerAddress: invoiceData.tipoConsumo === 'domicilio' ? (invoiceData.customer.address || 'Domicilio POS') : 'Consumo Local',
            items: invoiceData.items.map(i => ({
                productId: i.productId,
                productName: i.name,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                subtotal: i.subtotal
            })),
            subtotal: invoiceData.subtotal,
            total: invoiceData.total,
            orderDate: now,
            orderStatus: 'Pendiente',
            paymentMethod: invoiceData.paymentMethod,
            paymentStatus: 'paid', // En POS la venta se asume cobrada para ir a cocina
            origin: `pos-${invoiceData.mesa || 'barra'}`,
            tipoEntrega: invoiceData.tipoConsumo === 'domicilio' ? 'domicilio' : 'recoger_en_tienda'
        });
    }

    return { invoiceId, consecutiveStr };
  });
}
