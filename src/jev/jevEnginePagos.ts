'use server';

import { getJevCopilotLimitsInfo, consumeJevCopilotCredit } from './jevLimitsService';

import { getPagosContext, ContextoPagos, DeudorCobroJev } from './contextAggregatorPagos';
import { registrarAccionJev, cerrarAccionJev } from './jevMemory';

export interface SugerenciaCobroJev {
  id: string;
  orderId: string;
  cliente: string;
  telefono: string;
  monto: number;
  diasPendiente: number;
  titulo: string;
  justificacion: string;
  borradorMensaje: string;
}

export interface CopilotoPagosOutput {
  diagnostico: string;
  totalCobradoMes: number;
  totalPendienteCobro: number;
  pagosVencidosCount: number;
  deudoresCount: number;
  metodosMasUsados: { metodo: string; cantidad: number }[];
  deudoresPendientes: DeudorCobroJev[];
  sugerencias: SugerenciaCobroJev[];
  patronesAprendidos: string[];
  fechaGeneracion: string;
}

/**
 * Motor de IA de JEV para Pagos y Cobros (Regla 3: Solo propone. Nunca cobra de forma automática).
 */
export async function obtenerCopilotoPagos(businessId: string): Promise<CopilotoPagosOutput> {

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
  

  const contexto: ContextoPagos = await getPagosContext(businessId);

  // Aprendizaje obligatorio de jev_memory (Regla 9)
  const cobrosPrevios = contexto.historialMemoria.filter((m) => m.tipo === 'pagos');
  const patronesAprendidos: string[] = [];

  if (cobrosPrevios.length > 0) {
    patronesAprendidos.push(
      `JEV recuerda ${cobrosPrevios.length} recordatorio(s) de cobro gestionados anteriormente.`
    );
  } else {
    patronesAprendidos.push('Sin historial de cobros previo en memoria. JEV aprenderá con los registros de hoy.');
  }

  // Generar de 2 a 5 sugerencias accionables basadas en la cartera
  const sugerencias: SugerenciaCobroJev[] = contexto.deudoresPendientes.slice(0, 5).map((deudor) => {
    const borradorMensaje = `¡Hola ${deudor.cliente}! Te saludamos cordialmente. Tenemos pendiente la conciliación del pago de tu pedido #${deudor.orderId.slice(-7).toUpperCase()} por valor de $${deudor.monto.toLocaleString('es-CO')} (${deudor.metodoPago}). ¿Nos podrías confirmar el soporte o método de pago para cerrarlo en sistema? ¡Muchas gracias!`;

    return {
      id: `sug-pago-${deudor.orderId}`,
      orderId: deudor.orderId,
      cliente: deudor.cliente,
      telefono: deudor.telefono,
      monto: deudor.monto,
      diasPendiente: deudor.diasPendiente,
      titulo: `Recordatorio de cobro a ${deudor.cliente} ($${deudor.monto.toLocaleString('es-CO')})`,
      justificacion: deudor.esVencido
        ? `Pago vencido: lleva ${deudor.diasPendiente} días pendiente de cobro.`
        : `Cobro pendiente hace ${deudor.diasPendiente} días vía ${deudor.metodoPago}.`,
      borradorMensaje,
    };
  });

  // Diagnóstico fundamentado
  let diagnostico = '';
  if (contexto.pagosVencidosCount > 0) {
    diagnostico = `⚠️ Cartera vencida: ${contexto.pagosVencidosCount} pago(s) superan los 15 días de atraso. Total pendiente de cobro: $${contexto.totalPendienteCobro.toLocaleString('es-CO')}.`;
  } else if (contexto.totalPendienteCobro > 0) {
    diagnostico = `Cobros en curso: $${contexto.totalPendienteCobro.toLocaleString('es-CO')} pendientes de conciliar en ${contexto.deudoresPendientes.length} pedido(s). Cobrado este mes: $${contexto.totalCobradoMes.toLocaleString('es-CO')}.`;
  } else {
    diagnostico = `Cartera al día. Todos los pedidos registrados han sido pagados y conciliados. Cobrado este mes: $${contexto.totalCobradoMes.toLocaleString('es-CO')}.`;
  }

  return {
    diagnostico,
    totalCobradoMes: contexto.totalCobradoMes,
    totalPendienteCobro: contexto.totalPendienteCobro,
    pagosVencidosCount: contexto.pagosVencidosCount,
    deudoresCount: contexto.deudoresPendientes.length,
    metodosMasUsados: contexto.metodosMasUsados,
    deudoresPendientes: contexto.deudoresPendientes,
    sugerencias,
    patronesAprendidos,
    fechaGeneracion: new Date().toISOString(),
  };
}

/**
 * Consulta en lenguaje natural a JEV sobre pagos.
 */
export async function consultarJevPagos(businessId: string, pregunta: string): Promise<string> {

  // Validación de límites y consumo atómico para chat (Fase 3 & Bugfix)
  const limitsInfo = await getJevCopilotLimitsInfo(businessId);
  if (!limitsInfo.isModuleActive) {
    return "El módulo JEV Copiloto no está activo para el plan actual de este negocio.";
  }
  if (!limitsInfo.canConsume) {
    return `Has alcanzado el límite diario de consultas (${limitsInfo.usageToday}/${limitsInfo.totalReal}) de JEV Copiloto para hoy. El cupo se reinicia automáticamente mañana o puedes solicitar una ampliación al administrador.`;
  }
  await consumeJevCopilotCredit(businessId);


  const contexto = await getPagosContext(businessId);
  const q = (pregunta || '').toLowerCase();

  if (q.includes('debe') || q.includes('deudor') || q.includes('quien') || q.includes('cartera')) {
    if (contexto.deudoresPendientes.length === 0) {
      return 'Actualmente ningún cliente tiene saldos pendientes de pago.';
    }
    const d = contexto.deudoresPendientes[0];
    return `Mayor saldo pendiente: ${d.cliente} por valor de $${d.monto.toLocaleString('es-CO')} (${d.diasPendiente} días de atraso, pedido #${d.orderId.slice(-7).toUpperCase()}). Total cartera: $${contexto.totalPendienteCobro.toLocaleString('es-CO')}.`;
  }

  if (q.includes('cobre') || q.includes('cobrado') || q.includes('ingreso') || q.includes('este mes')) {
    return `Total cobrado en el mes en curso: $${contexto.totalCobradoMes.toLocaleString('es-CO')}. Adicionalmente hay $${contexto.totalPendienteCobro.toLocaleString('es-CO')} en proceso de cobro.`;
  }

  if (q.includes('metodo') || q.includes('pasarela') || q.includes('mas usado') || q.includes('preferido')) {
    if (contexto.metodosMasUsados.length === 0) {
      return 'Aún no hay suficientes transacciones para determinar el método favorito.';
    }
    const fav = contexto.metodosMasUsados[0];
    return `El método de pago más usado por tus clientes es "${fav.metodo}" con ${fav.cantidad} transacciones registradas.`;
  }

  return `Resumen financiero: $${contexto.totalCobradoMes.toLocaleString('es-CO')} cobrados este mes y $${contexto.totalPendienteCobro.toLocaleString('es-CO')} en cartera pendiente.`;
}

/**
 * Registra en jev_memory que el usuario envió un recordatorio de pago.
 */
export async function registrarRecordatorioPagoEnviado({
  businessId,
  orderId,
  cliente,
  monto,
  borrador,
}: {
  businessId: string;
  orderId: string;
  cliente: string;
  monto: number;
  borrador: string;
}): Promise<string> {
  return registrarAccionJev({
    tipo: 'pagos',
    accion: `Recordatorio de cobro enviado por WhatsApp a ${cliente} ($${monto.toLocaleString('es-CO')})`,
    datos: {
      referenciaId: orderId,
      cliente,
      monto,
      sugerenciaJev: borrador,
      canal: 'whatsapp',
      resultado: 'enviada',
    },
    origen: 'JevCopilotWidgetPagos',
    usuario: businessId,
  });
}

/**
 * Cierra la acción en memoria.
 */
export async function cerrarAccionPagos(memoriaId: string, resultado: string) {
  return cerrarAccionJev(memoriaId, resultado);
}
