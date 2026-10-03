'use server';

import { getJevCopilotLimitsInfo, consumeJevCopilotCredit } from './jevLimitsService';

import { getPedidosContext, ContextoPedidos, PedidoOperativoJev } from './contextAggregatorPedidos';
import { registrarAccionJev, cerrarAccionJev } from './jevMemory';

export interface BorradorNotificacionPedido {
  id: string;
  pedidoId: string;
  cliente: string;
  telefono: string;
  estadoActual: string;
  total: number;
  motivoUrgencia: string;
  borradorMensaje: string;
}

export interface CopilotoPedidosOutput {
  diagnostico: string;
  totalActivos: number;
  totalUrgentes: number;
  retrasadosCount: number;
  altoValorCount: number;
  pedidosUrgentes: PedidoOperativoJev[];
  borradoresNotificacion: BorradorNotificacionPedido[];
  patronesAprendidos: string[];
  fechaGeneracion: string;
}

/**
 * Motor de IA de JEV para Pedidos y Operaciones (Regla 3: Solo propone. Nunca modifica estados ni ejecuta envíos).
 */
export async function obtenerCopilotoPedidos(businessId: string): Promise<CopilotoPedidosOutput> {

  // Validación de límites y consumo atómico (Fase 3 & Proxy Universal anti-TypeError)
  const limitsInfo = await getJevCopilotLimitsInfo(businessId);
  if (!limitsInfo.isModuleActive) {
    return new Proxy({
      diagnostico: "El módulo JEV Copiloto no está activo para el plan actual de este negocio.",
      fechaGeneracion: new Date().toISOString(),
    }, {
      get(target, prop) {
        if (prop in target) return (target as any)[prop];
        if (typeof prop === 'string' && (prop.endsWith('Count') || prop.includes('Total') || prop.includes('Debitos') || prop.includes('Creditos') || prop.includes('Inversion'))) return 0;
        return [];
      }
    }) as any;
  }
  if (!limitsInfo.canConsume) {
    return new Proxy({
      diagnostico: `Has alcanzado el límite diario de consultas (${limitsInfo.usageToday}/${limitsInfo.totalReal}) de JEV Copiloto para hoy. El cupo se reinicia automáticamente mañana o puedes solicitar una ampliación al administrador.`,
      fechaGeneracion: new Date().toISOString(),
    }, {
      get(target, prop) {
        if (prop in target) return (target as any)[prop];
        if (typeof prop === 'string' && (prop.endsWith('Count') || prop.includes('Total') || prop.includes('Debitos') || prop.includes('Creditos') || prop.includes('Inversion'))) return 0;
        return [];
      }
    }) as any;
  }
  await consumeJevCopilotCredit(businessId);
  

  const contexto: ContextoPedidos = await getPedidosContext(businessId);

  // Aprendizaje obligatorio de jev_memory (Regla 9)
  const notificacionesPrevias = contexto.historialMemoria.filter((m) => m.tipo === 'pedidos');
  const patronesAprendidos: string[] = [];

  if (notificacionesPrevias.length > 0) {
    patronesAprendidos.push(
      `JEV recuerda ${notificacionesPrevias.length} notificación(es) operativa(s) gestionadas previamente.`
    );
  } else {
    patronesAprendidos.push('Sin historial de operaciones previo. JEV aprenderá con los registros de hoy.');
  }

  // Generar borradores de notificación para el cliente
  const borradoresNotificacion: BorradorNotificacionPedido[] = contexto.pedidosUrgentes.map((pedido) => {
    let borradorMensaje = '';

    if (pedido.esRetrasado) {
      borradorMensaje = `¡Hola ${pedido.clienteNombre}! Te saludamos de nuestro establecimiento. Queremos ofrecerte una sincera disculpa: tu pedido #${pedido.id.slice(-7).toUpperCase()} presenta una demora en preparación. Estamos priorizándolo en este momento para despachártelo a la mayor brevedad.`;
    } else {
      borradorMensaje = `¡Hola ${pedido.clienteNombre}! Gracias por tu compra. Te confirmamos que tu pedido #${pedido.id.slice(-7).toUpperCase()} ya está registrado y nuestro equipo se encuentra preparándolo. ¡Te avisaremos en cuanto salga en camino!`;
    }

    return {
      id: `notif-${pedido.id}`,
      pedidoId: pedido.id,
      cliente: pedido.clienteNombre,
      telefono: pedido.telefono,
      estadoActual: pedido.estado,
      total: pedido.total,
      motivoUrgencia: pedido.motivoUrgencia,
      borradorMensaje,
    };
  });

  // Diagnóstico fundamentado (Regla 8)
  let diagnostico = '';
  if (contexto.pedidosRetrasados.length > 0) {
    diagnostico = `⚠️ Cuello de botella crítico: ${contexto.pedidosRetrasados.length} pedido(s) llevan más de 2 horas sin completarse.`;
  } else if (contexto.pedidosUrgentes.length > 0) {
    diagnostico = `Operación activa: ${contexto.pedidosUrgentes.length} pedido(s) pendientes de atención prioritaria o de alto valor.`;
  } else {
    diagnostico = `Operación al día. No hay pedidos demorados ni cuellos de botella activos en este momento.`;
  }

  return {
    diagnostico,
    totalActivos: contexto.totalPedidosActivos,
    totalUrgentes: contexto.pedidosUrgentes.length,
    retrasadosCount: contexto.pedidosRetrasados.length,
    altoValorCount: contexto.pedidosAltoValor.length,
    pedidosUrgentes: contexto.pedidosUrgentes,
    borradoresNotificacion,
    patronesAprendidos,
    fechaGeneracion: new Date().toISOString(),
  };
}

/**
 * Consulta en lenguaje natural a JEV sobre operaciones y pedidos.
 */
export async function consultarJevPedidos(businessId: string, pregunta: string): Promise<string> {

  // Validación de límites y consumo atómico para chat (Fase 3 & Bugfix)
  const limitsInfo = await getJevCopilotLimitsInfo(businessId);
  if (!limitsInfo.isModuleActive) {
    return "El módulo JEV Copiloto no está activo para el plan actual de este negocio.";
  }
  if (!limitsInfo.canConsume) {
    return `Has alcanzado el límite diario de consultas (${limitsInfo.usageToday}/${limitsInfo.totalReal}) de JEV Copiloto para hoy. El cupo se reinicia automáticamente mañana o puedes solicitar una ampliación al administrador.`;
  }
  await consumeJevCopilotCredit(businessId);


  const contexto = await getPedidosContext(businessId);
  const q = (pregunta || '').toLowerCase();

  if (q.includes('retrasado') || q.includes('demora') || q.includes('tardando') || q.includes('cuello')) {
    if (contexto.pedidosRetrasados.length === 0) {
      return 'No hay pedidos con retraso operativo superior a 2 horas. El flujo marcha en los tiempos previstos.';
    }
    const p = contexto.pedidosRetrasados[0];
    return `Pedido más demorado: #${p.id.slice(-7).toUpperCase()} de ${p.clienteNombre} (${p.estado}). Lleva ${Math.round(p.minutosTranscurridos / 60)} horas en curso.`;
  }

  if (q.includes('valioso') || q.includes('monto') || q.includes('mayor valor') || q.includes('caro')) {
    if (contexto.pedidosAltoValor.length === 0) {
      return 'No hay pedidos activos que superen el umbral de alto valor en este instante.';
    }
    const p = contexto.pedidosAltoValor[0];
    return `Pedido activo de mayor valor: #${p.id.slice(-7).toUpperCase()} de ${p.clienteNombre} por un total de $${p.total.toLocaleString('es-CO')} (${p.estado}).`;
  }

  if (q.includes('resumen') || q.includes('estado') || q.includes('operacion')) {
    return `Estado operativo: ${contexto.totalPedidosActivos} pedidos activos en curso, de los cuales ${contexto.pedidosRetrasados.length} presentan retraso y ${contexto.pedidosAltoValor.length} son de alto valor.`;
  }

  return `Resumen de operaciones: ${contexto.totalPedidosActivos} pedidos en curso (${contexto.pedidosRetrasados.length} demorados).`;
}

/**
 * Registra en jev_memory que el usuario copió una notificación para el pedido.
 */
export async function registrarNotificacionPedidoCopiada({
  businessId,
  pedidoId,
  cliente,
  borrador,
  metricasAntes,
}: {
  businessId: string;
  pedidoId: string;
  cliente: string;
  borrador: string;
  metricasAntes: { minutosTranscurridos: number; total: number; estado: string };
}): Promise<string> {
  return registrarAccionJev({
    tipo: 'pedidos',
    accion: `Notificación copiada para pedido #${pedidoId.slice(-7).toUpperCase()} de ${cliente}`,
    datos: {
      referenciaId: pedidoId,
      cliente,
      sugerenciaJev: borrador,
      metricasAntes,
      resultado: 'copiado_para_notificar',
    },
    origen: 'JevCopilotWidgetPedidos',
    usuario: businessId,
  });
}

/**
 * Cierra la acción en memoria.
 */
export async function cerrarAccionPedidos(memoriaId: string, resultado: string) {
  return cerrarAccionJev(memoriaId, resultado);
}
