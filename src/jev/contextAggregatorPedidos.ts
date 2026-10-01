import { getAdminFirestore } from '@/firebase/server-init';
import { obtenerAccionesJev } from './jevMemory';

export interface PedidoOperativoJev {
  id: string;
  clienteNombre: string;
  telefono: string;
  estado: string; // "Pendiente" | "En proceso" | "Enviado" | "Entregado" | "Cancelado"
  total: number;
  tipoEntrega: 'domicilio' | 'recoger_en_tienda';
  fechaOrden: string;
  minutosTranscurridos: number;
  esRetrasado: boolean;
  esAltoValor: boolean;
  nivelUrgencia: 'critico' | 'alerta' | 'normal';
  motivoUrgencia: string;
}

export interface ContextoPedidos {
  businessId: string;
  totalPedidosActivos: number;
  pedidosUrgentes: PedidoOperativoJev[];
  pedidosRetrasados: PedidoOperativoJev[];
  pedidosAltoValor: PedidoOperativoJev[];
  todosLosPedidos: PedidoOperativoJev[];
  historialMemoria: any[];
  estado: 'optimo' | 'atencion_requerida' | 'sin_datos';
  ultimaActualizacion: string;
}

/**
 * Agregador de contexto para Pedidos y Operaciones (SOLO LECTURA).
 * Consulta la colección orders sin modificar ningún dato ni estado.
 */
export async function getPedidosContext(businessId: string): Promise<ContextoPedidos> {
  if (!businessId || typeof businessId !== 'string') {
    throw new Error('[JEV CONTEXT PEDIDOS] businessId es obligatorio.');
  }

  const firestore = await getAdminFirestore();

  try {
    // 1. Lectura de Pedidos activos y recientes (SOLO LECTURA)
    const ordersSnap = await firestore
      .collection(`businesses/${businessId}/orders`)
      .orderBy('orderDate', 'desc')
      .limit(100)
      .get();

    if (ordersSnap.empty) {
      return {
        businessId,
        totalPedidosActivos: 0,
        pedidosUrgentes: [],
        pedidosRetrasados: [],
        pedidosAltoValor: [],
        todosLosPedidos: [],
        historialMemoria: [],
        estado: 'sin_datos',
        ultimaActualizacion: new Date().toISOString(),
      };
    }

    const ahora = new Date().getTime();
    const todosLosPedidos: PedidoOperativoJev[] = [];

    // Calcular ticket promedio para detectar "Alto Valor" (pedidos > 1.5x el promedio o > $100.000 COP)
    let sumaTotales = 0;
    let countTotales = 0;

    ordersSnap.forEach((doc) => {
      const o = doc.data();
      const total = Number(o.total || o.subtotal) || 0;
      sumaTotales += total;
      countTotales++;
    });

    const ticketPromedio = countTotales > 0 ? sumaTotales / countTotales : 50000;
    const umbralAltoValor = Math.max(100000, ticketPromedio * 1.5);

    ordersSnap.forEach((doc) => {
      const o = doc.data();
      const estado = o.orderStatus || 'Pendiente';
      const esActivo = estado === 'Pendiente' || estado === 'En proceso';
      
      const fechaOrdenStr = o.orderDate || new Date().toISOString();
      const fechaOrdenTime = new Date(fechaOrdenStr).getTime();
      const minutosTranscurridos = Math.max(0, Math.round((ahora - fechaOrdenTime) / (1000 * 60)));
      const total = Number(o.total || o.subtotal) || 0;

      // Criterio de retraso: Pendiente o En Proceso por más de 120 minutos (2 horas)
      const esRetrasado = esActivo && minutosTranscurridos > 120;
      const esAltoValor = total >= umbralAltoValor;

      let nivelUrgencia: 'critico' | 'alerta' | 'normal' = 'normal';
      let motivoUrgencia = 'Pedido en curso';

      if (esRetrasado) {
        nivelUrgencia = 'critico';
        motivoUrgencia = `Retrasado: lleva ${Math.round(minutosTranscurridos / 60)} horas en estado "${estado}".`;
      } else if (esAltoValor && esActivo) {
        nivelUrgencia = 'alerta';
        motivoUrgencia = `Pedido de Alto Valor ($${total.toLocaleString('es-CO')}) pendiente de despacho.`;
      } else if (estado === 'Pendiente') {
        nivelUrgencia = 'alerta';
        motivoUrgencia = `Nuevo pedido pendiente de confirmación (${minutosTranscurridos} min).`;
      }

      todosLosPedidos.push({
        id: doc.id,
        clienteNombre: o.customerName || 'Cliente',
        telefono: o.customerPhone || 'Sin teléfono',
        estado,
        total,
        tipoEntrega: o.tipoEntrega || 'domicilio',
        fechaOrden: fechaOrdenStr,
        minutosTranscurridos,
        esRetrasado,
        esAltoValor,
        nivelUrgencia,
        motivoUrgencia,
      });
    });

    const pedidosActivos = todosLosPedidos.filter((p) => p.estado === 'Pendiente' || p.estado === 'En proceso');
    const pedidosRetrasados = pedidosActivos.filter((p) => p.esRetrasado);
    const pedidosAltoValor = pedidosActivos.filter((p) => p.esAltoValor);

    // Priorizar urgentes (críticos primero, luego alertas)
    const pedidosUrgentes = pedidosActivos.filter((p) => p.nivelUrgencia === 'critico' || p.nivelUrgencia === 'alerta');
    pedidosUrgentes.sort((a, b) => b.minutosTranscurridos - a.minutosTranscurridos);

    // 2. Memoria histórica de JEV
    const historialMemoria = await obtenerAccionesJev({
      usuario: businessId,
      tipo: 'pedidos',
      limite: 10,
    });

    const estadoOp = pedidosRetrasados.length > 0 ? 'atencion_requerida' : 'optimo';

    return {
      businessId,
      totalPedidosActivos: pedidosActivos.length,
      pedidosUrgentes,
      pedidosRetrasados,
      pedidosAltoValor,
      todosLosPedidos,
      historialMemoria,
      estado: estadoOp,
      ultimaActualizacion: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('[JEV CONTEXT PEDIDOS] Error:', error);
    return {
      businessId,
      totalPedidosActivos: 0,
      pedidosUrgentes: [],
      pedidosRetrasados: [],
      pedidosAltoValor: [],
      todosLosPedidos: [],
      historialMemoria: [],
      estado: 'sin_datos',
      ultimaActualizacion: new Date().toISOString(),
    };
  }
}

/**
 * Función pública para el Resumen Ejecutivo (Fase 7)
 */
export async function getMetricasPilarPedidos(businessId: string) {
  const contexto = await getPedidosContext(businessId);
  return {
    pilar: 'pedidos',
    activos: contexto.totalPedidosActivos,
    retrasados: contexto.pedidosRetrasados.length,
    altoValor: contexto.pedidosAltoValor.length,
    estado: contexto.estado,
    alertaCritica: contexto.pedidosRetrasados.length > 0,
  };
}
