import { Firestore, runTransaction, doc, collection, increment } from 'firebase/firestore';
import type { Invoice, VerticalType } from '@/types/billing';
import type { Product } from '@/models/product';

/**
 * @fileOverview Servicio de persistencia para la Terminal POS.
 * Ejecuta transacciones atómicas para garantizar la integridad del stock y consecutivos.
 * Implementa sanitización recursiva para evitar errores de campos 'undefined' en Firestore.
 */

/**
 * Elimina valores 'undefined' de un objeto de forma recursiva, convirtiéndolos en 'null'.
 * Requisito crítico para la estabilidad de transacciones en Firestore.
 */
const sanitizePayload = (obj: any): any => {
  return JSON.parse(JSON.stringify(obj, (key, value) => (value === undefined ? null : value)));
};

export async function processSale(
  db: Firestore,
  businessId: string,
  userId: string,
  invoiceData: Omit<Invoice, 'id' | 'consecutiveNumber' | 'createdAt' | 'status'>,
  businessType: VerticalType
) {
  return await runTransaction(db, async (transaction) => {
    // --- FASE 1: TODAS LAS LECTURAS Y VALIDACIONES PRIMERO (READ BEFORE WRITE) ---
    
    // 1. Preparar referencias y recolectar promesas de lectura para productos
    const itemRefs = invoiceData.items.map(item => ({
      item,
      ref: doc(db, `businesses/${businessId}/products`, item.productId)
    }));

    // 2. Leer todos los productos en paralelo antes de cualquier escritura
    const productSnaps = await Promise.all(itemRefs.map(itemRef => transaction.get(itemRef.ref)));

    // 3. Leer el contador de facturas (también debe ser lectura previa)
    const counterRef = doc(db, `businesses/${businessId}/counters`, 'invoices');
    const counterSnap = await transaction.get(counterRef);

    // --- FASE 2: VALIDACIONES Y CÁLCULOS EN MEMORIA ---

    // Validar integridad y stock disponible para cada producto
    productSnaps.forEach((snap, index) => {
      const item = invoiceData.items[index];
      if (!snap.exists()) {
        throw new Error(`El producto "${item.name}" ya no existe en el catálogo.`);
      }

      const productData = snap.data() as Product;
      
      // Validar stock si el producto tiene stock controlado
      if (productData.stock !== null && productData.stock !== undefined) {
        if (productData.stock < item.quantity) {
          throw new Error(`Stock insuficiente para "${item.name}". Disponible: ${productData.stock}`);
        }
      }
    });

    // Calcular el siguiente consecutivo
    let nextNumber = 1;
    if (counterSnap.exists()) {
      nextNumber = (counterSnap.data().current || 0) + 1;
    }

    const consecutiveStr = `POS-${String(nextNumber).padStart(4, '0')}`;
    const invoiceId = doc(collection(db, 'placeholder')).id;
    const now = new Date().toISOString();

    // --- FASE 3: TODAS LAS ESCRITURAS AL FINAL ---

    // 1. Aplicar descuentos de stock en el maestro de productos
    itemRefs.forEach((itemRef, index) => {
      const snap = productSnaps[index];
      const productData = snap.data() as Product;
      
      if (productData.stock !== null && productData.stock !== undefined) {
        transaction.update(itemRef.ref, {
          stock: increment(-itemRef.item.quantity)
        });
      }
    });

    // 2. Actualizar Consecutivo Atómico
    transaction.set(counterRef, { current: nextNumber }, { merge: true });

    // 3. Registrar Factura Oficial (CON SANITIZACIÓN)
    const invoiceRef = doc(db, `businesses/${businessId}/invoices`, invoiceId);
    const rawInvoice: Invoice = {
      ...invoiceData,
      id: invoiceId,
      consecutiveNumber: consecutiveStr,
      createdAt: now,
      status: 'completada'
    };
    
    // Blindaje contra valores 'undefined'
    transaction.set(invoiceRef, sanitizePayload(rawInvoice));

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
        const rawOrder = {
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
            paymentStatus: 'paid',
            origin: `pos-${invoiceData.mesa || 'barra'}`,
            tipoEntrega: invoiceData.tipoConsumo === 'domicilio' ? 'domicilio' : 'recoger_en_tienda'
        };
        
        // Blindaje contra valores 'undefined' en la orden espejo
        transaction.set(orderRef, sanitizePayload(rawOrder));
    }

    return { invoiceId, consecutiveStr };
  });
}
