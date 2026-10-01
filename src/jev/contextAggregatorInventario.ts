import { getAdminFirestore } from '@/firebase/server-init';
import { obtenerAccionesJev } from './jevMemory';

export interface ProductoInventarioJev {
  id: string;
  nombre: string;
  stockActual: number;
  precio: number;
  categoria?: string;
  unidadesVendidas30d: number;
  velocidadDiaria: number; // Unidades por día
  diasStockRestante: number; // Predicción matemática
  nivelRiesgo: 'critico' | 'alerta' | 'saludable' | 'lento';
  cantidadSugeridaReabastecer: number;
  inversionEstimada: number;
  origen: 'kardex' | 'catalogo';
}

export interface ContextoInventario {
  businessId: string;
  totalProductos: number;
  productosCriticos: ProductoInventarioJev[];
  productosAlerta: ProductoInventarioJev[];
  productosLentos: ProductoInventarioJev[];
  todosLosProductos: ProductoInventarioJev[];
  historialMemoria: any[];
  estado: 'optimo' | 'riesgo_quiebre' | 'sin_datos';
  ultimaActualizacion: string;
}

/**
 * Agregador de contexto para Inventario (SOLO LECTURA).
 * Consulta tanto kardexItems (stock en bodega y alertas) como el catálogo de productos.
 */
export async function getInventarioContext(businessId: string): Promise<ContextoInventario> {
  if (!businessId || typeof businessId !== 'string') {
    throw new Error('[JEV CONTEXT INVENTARIO] businessId es obligatorio.');
  }

  const firestore = await getAdminFirestore();

  try {
    // 1. Lectura de Pedidos recientes para calcular velocidad de rotación (últimos 30 días)
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 30);
    const fechaLimiteStr = fechaLimite.toISOString();
    const ventasPorProducto: Record<string, number> = {};

    try {
      const ordersSnap = await firestore
        .collection(`businesses/${businessId}/orders`)
        .where('orderDate', '>=', fechaLimiteStr)
        .limit(100)
        .get();

      ordersSnap.forEach((doc) => {
        const orderData = doc.data();
        if (orderData.items && Array.isArray(orderData.items)) {
          orderData.items.forEach((item: any) => {
            if (item.productId) {
              ventasPorProducto[item.productId] = (ventasPorProducto[item.productId] || 0) + (Number(item.quantity) || 1);
            }
          });
        }
      });
    } catch (e) {
      // Si la colección de órdenes no tiene registros, continúa con ventas en 0
    }

    const todosLosProductos: ProductoInventarioJev[] = [];
    const idsProcesados = new Set<string>();

    // 2. Lectura prioritaria de Ítems del Kardex (SOLO LECTURA de kardexItems)
    try {
      const kardexSnap = await firestore
        .collection(`businesses/${businessId}/kardexItems`)
        .get();

      kardexSnap.forEach((doc) => {
        const kItem = doc.data();
        const stockActual = Number(kItem.stockActual) || 0;
        const stockMinimo = Number(kItem.stockMinimo) || 5;
        const stockMaximo = Number(kItem.stockMaximo) || (stockMinimo * 3 || 20);
        const costoUnitario = Number(kItem.costoUnitario) || 0;
        const unidadesVendidas30d = ventasPorProducto[doc.id] || 0;
        const velocidadDiaria = Math.round((unidadesVendidas30d / 30) * 100) / 100;

        // Días estimados de stock restante
        let diasStockRestante = 999;
        if (stockActual <= 0) {
          diasStockRestante = 0;
        } else if (velocidadDiaria > 0) {
          diasStockRestante = Math.round(stockActual / velocidadDiaria);
        } else if (stockActual <= stockMinimo) {
          diasStockRestante = 3; // Alerta crítica por estar por debajo del mínimo configurado
        }

        // Clasificación estricta de riesgo Kardex
        let nivelRiesgo: 'critico' | 'alerta' | 'saludable' | 'lento' = 'saludable';
        if (stockActual <= 0 || stockActual <= stockMinimo || diasStockRestante <= 7) {
          nivelRiesgo = 'critico';
        } else if (diasStockRestante <= 15) {
          nivelRiesgo = 'alerta';
        }

        const cantidadSugeridaReabastecer = Math.max(10, stockMaximo - stockActual);
        const inversionEstimada = cantidadSugeridaReabastecer * (costoUnitario || 1000);

        todosLosProductos.push({
          id: doc.id,
          nombre: kItem.nombre || 'Item Kardex',
          stockActual,
          precio: costoUnitario,
          categoria: kItem.categoria || 'Kardex',
          unidadesVendidas30d,
          velocidadDiaria,
          diasStockRestante,
          nivelRiesgo,
          cantidadSugeridaReabastecer,
          inversionEstimada,
          origen: 'kardex',
        });

        idsProcesados.add(doc.id);
      });
    } catch (e) {
      console.warn('[JEV INVENTARIO] kardexItems no disponible:', e);
    }

    // 3. Complementar con catálogo de productos si no están ya en el Kardex
    try {
      const productsSnap = await firestore
        .collection(`businesses/${businessId}/products`)
        .get();

      productsSnap.forEach((doc) => {
        if (!idsProcesados.has(doc.id)) {
          const p = doc.data();
          const stockActual = Number(p.stock) || 0;
          const precio = Number(p.price) || 0;
          const unidadesVendidas30d = ventasPorProducto[doc.id] || 0;
          const velocidadDiaria = Math.round((unidadesVendidas30d / 30) * 100) / 100;

          let diasStockRestante = 999;
          if (stockActual <= 0) {
            diasStockRestante = 0;
          } else if (velocidadDiaria > 0) {
            diasStockRestante = Math.round(stockActual / velocidadDiaria);
          }

          let nivelRiesgo: 'critico' | 'alerta' | 'saludable' | 'lento' = 'saludable';
          if (stockActual <= 0 || diasStockRestante <= 7) {
            nivelRiesgo = 'critico';
          } else if (diasStockRestante <= 15) {
            nivelRiesgo = 'alerta';
          } else if (stockActual > 15 && unidadesVendidas30d === 0) {
            nivelRiesgo = 'lento';
          }

          const baseReabastecimiento = velocidadDiaria > 0 ? Math.ceil(velocidadDiaria * 30) : 10;
          const cantidadSugeridaReabastecer = Math.max(0, baseReabastecimiento - stockActual);
          const inversionEstimada = cantidadSugeridaReabastecer * (Number(p.basePrice) || Math.round(precio * 0.6));

          todosLosProductos.push({
            id: doc.id,
            nombre: p.name || 'Producto sin nombre',
            stockActual,
            precio,
            categoria: p.category || 'General',
            unidadesVendidas30d,
            velocidadDiaria,
            diasStockRestante,
            nivelRiesgo,
            cantidadSugeridaReabastecer,
            inversionEstimada,
            origen: 'catalogo',
          });

          idsProcesados.add(doc.id);
        }
      });
    } catch (e) {
      console.warn('[JEV INVENTARIO] products no disponible:', e);
    }

    if (todosLosProductos.length === 0) {
      return {
        businessId,
        totalProductos: 0,
        productosCriticos: [],
        productosAlerta: [],
        productosLentos: [],
        todosLosProductos: [],
        historialMemoria: [],
        estado: 'sin_datos',
        ultimaActualizacion: new Date().toISOString(),
      };
    }

    // Ordenar de mayor a menor urgencia de quiebre (0 días primero)
    todosLosProductos.sort((a, b) => a.diasStockRestante - b.diasStockRestante);

    const productosCriticos = todosLosProductos.filter((p) => p.nivelRiesgo === 'critico');
    const productosAlerta = todosLosProductos.filter((p) => p.nivelRiesgo === 'alerta');
    const productosLentos = todosLosProductos.filter((p) => p.nivelRiesgo === 'lento');

    // 4. Memoria histórica de JEV
    const historialMemoria = await obtenerAccionesJev({
      usuario: businessId,
      tipo: 'inventario',
      limite: 10,
    });

    const estado = productosCriticos.length > 0 ? 'riesgo_quiebre' : 'optimo';

    return {
      businessId,
      totalProductos: todosLosProductos.length,
      productosCriticos,
      productosAlerta,
      productosLentos,
      todosLosProductos,
      historialMemoria,
      estado,
      ultimaActualizacion: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('[JEV CONTEXT INVENTARIO] Error:', error);
    return {
      businessId,
      totalProductos: 0,
      productosCriticos: [],
      productosAlerta: [],
      productosLentos: [],
      todosLosProductos: [],
      historialMemoria: [],
      estado: 'sin_datos',
      ultimaActualizacion: new Date().toISOString(),
    };
  }
}

/**
 * Función pública para el Resumen Ejecutivo (Fase 7)
 */
export async function getMetricasPilarInventario(businessId: string) {
  const contexto = await getInventarioContext(businessId);
  return {
    pilar: 'inventario',
    totalProductos: contexto.totalProductos,
    criticos: contexto.productosCriticos.length,
    alertas: contexto.productosAlerta.length,
    estado: contexto.estado,
    alertaCritica: contexto.productosCriticos.length > 0,
  };
}
