'use server';

import { getInventarioContext, ContextoInventario, ProductoInventarioJev } from './contextAggregatorInventario';
import { registrarAccionJev, cerrarAccionJev } from './jevMemory';

export interface BorradorOrdenCompraItem {
  id: string;
  nombre: string;
  stockActual: number;
  cantidadSugerida: number;
  costoEstimadoUnitario: number;
  inversionSubtotal: number;
}

export interface CopilotoInventarioOutput {
  diagnostico: string;
  totalProductos: number;
  productosCriticos: ProductoInventarioJev[];
  productosAlerta: ProductoInventarioJev[];
  productosLentos: ProductoInventarioJev[];
  borradorOrdenCompra: BorradorOrdenCompraItem[];
  inversionTotalEstimada: number;
  patronesAprendidos: string[];
  fechaGeneracion: string;
}

/**
 * Motor predictivo de JEV para Inventario (Regla 3: Solo lee y propone. Nunca modifica stock).
 */
export async function obtenerCopilotoInventario(businessId: string): Promise<CopilotoInventarioOutput> {
  const contexto: ContextoInventario = await getInventarioContext(businessId);

  // Aprendizaje obligatorio de jev_memory (Regla 9)
  const reabastecimientosPrevios = contexto.historialMemoria.filter((m) => m.accion.includes('orden de compra'));
  const patronesAprendidos: string[] = [];

  if (reabastecimientosPrevios.length > 0) {
    patronesAprendidos.push(
      `JEV recuerda ${reabastecimientosPrevios.length} orden(es) de compra sugeridas anteriormente.`
    );
  } else {
    patronesAprendidos.push('Sin historial de reabastecimiento previo en memoria.');
  }

  // Generar borrador de orden de compra priorizado
  const candidatosReorden = [...contexto.productosCriticos, ...contexto.productosAlerta];
  let inversionTotalEstimada = 0;

  const borradorOrdenCompra: BorradorOrdenCompraItem[] = candidatosReorden.map((p) => {
    inversionTotalEstimada += p.inversionEstimada;
    return {
      id: p.id,
      nombre: p.nombre,
      stockActual: p.stockActual,
      cantidadSugerida: p.cantidadSugeridaReabastecer,
      costoEstimadoUnitario: Math.round(p.precio * 0.6),
      inversionSubtotal: p.inversionEstimada,
    };
  });

  // Diagnóstico breve y fundamentado con datos (Regla 8)
  let diagnostico = '';
  if (contexto.productosCriticos.length > 0) {
    diagnostico = `⚠️ Atención inmediata: ${contexto.productosCriticos.length} producto(s) en riesgo crítico de quiebre (stock <= 7 días o agotados).`;
  } else if (contexto.productosAlerta.length > 0) {
    diagnostico = `Alerta preventiva: ${contexto.productosAlerta.length} producto(s) requerirán reabastecimiento en los próximos 15 días.`;
  } else {
    diagnostico = `Inventario saludable. Los ${contexto.totalProductos} productos cuentan con cobertura de stock adecuada según su rotación.`;
  }

  return {
    diagnostico,
    totalProductos: contexto.totalProductos,
    productosCriticos: contexto.productosCriticos,
    productosAlerta: contexto.productosAlerta,
    productosLentos: contexto.productosLentos,
    borradorOrdenCompra,
    inversionTotalEstimada,
    patronesAprendidos,
    fechaGeneracion: new Date().toISOString(),
  };
}

/**
 * Consulta en lenguaje natural a JEV sobre el inventario.
 */
export async function consultarJevInventario(businessId: string, pregunta: string): Promise<string> {
  const contexto = await getInventarioContext(businessId);
  const q = (pregunta || '').toLowerCase();

  if (q.includes('agotará') || q.includes('primero') || q.includes('quiebre')) {
    if (contexto.productosCriticos.length === 0) {
      return 'Actualmente ningún producto está en riesgo inminente de agotarse en menos de 7 días.';
    }
    const p = contexto.productosCriticos[0];
    return `El producto con mayor riesgo es "${p.nombre}". Stock actual: ${p.stockActual} unids, velocidad de venta: ${p.velocidadDiaria} unids/día. Días estimados de stock: ${p.diasStockRestante} días.`;
  }

  if (q.includes('lento') || q.includes('sobra') || q.includes('rotacion')) {
    if (contexto.productosLentos.length === 0) {
      return 'No se detecta exceso de inventario sin movimiento en los últimos 30 días.';
    }
    const nombres = contexto.productosLentos.slice(0, 3).map((p) => `"${p.nombre}" (${p.stockActual} unids en stock)`).join(', ');
    return `Productos de lenta rotación (sin ventas en 30 días): ${nombres}. Se sugiere promocionarlos o reducir compras futuras.`;
  }

  if (q.includes('inversion') || q.includes('comprar') || q.includes('cuanto') || q.includes('costo')) {
    const totalSugerido = contexto.productosCriticos.reduce((acc, p) => acc + p.inversionEstimada, 0);
    return `Inversión estimada para cubrir quiebres críticos: $${totalSugerido.toLocaleString('es-CO')} para reabastecer ${contexto.productosCriticos.length} producto(s) prioritario(s).`;
  }

  return `Diagnóstico general: ${contexto.productosCriticos.length} críticos, ${contexto.productosAlerta.length} en alerta preventiva y ${contexto.productosLentos.length} de lenta rotación.`;
}

/**
 * Registra en jev_memory que el usuario copió una orden de compra sugerida.
 */
export async function registrarOrdenCompraCopiada({
  businessId,
  items,
  inversionEstimada,
}: {
  businessId: string;
  items: BorradorOrdenCompraItem[];
  inversionEstimada: number;
}): Promise<string> {
  return registrarAccionJev({
    tipo: 'inventario',
    accion: `Borrador de orden de compra copiado (${items.length} productos)`,
    datos: {
      productosReabastecer: items.map((i) => ({ id: i.id, nombre: i.nombre, cantidad: i.cantidadSugerida })),
      inversionEstimada,
      metricasAntes: { itemsEnRiesgo: items.length },
    },
    origen: 'JevCopilotWidgetInventario',
    usuario: businessId,
  });
}

/**
 * Cierra la acción en memoria.
 */
export async function cerrarAccionInventario(memoriaId: string, resultado: string) {
  return cerrarAccionJev(memoriaId, resultado);
}
