'use server';

import { getContextoResumenGlobal, ContextoResumenGlobal } from './contextAggregatorResumen';
import { registrarAccionJev, cerrarAccionJev } from './jevMemory';

export interface InformeDiagnosticoJev {
  reportId: string;
  fechaGeneracion: string;
  estadoGeneral: string;
  resumenEjecutivo: string;
  cuadrantes: {
    visionCaja: { status: 'green' | 'yellow' | 'red'; text: string };
    actividad: { status: 'green' | 'yellow' | 'red'; text: string };
    operacion: { status: 'green' | 'yellow' | 'red'; text: string };
    retencion: { status: 'green' | 'yellow' | 'red'; text: string };
  };
  accionesRecomendadas: { id: string; pilar: string; titulo: string; prioridad: 'High' | 'Medium' | 'Low' }[];
  historialInformes: any[];
}

/**
 * Motor unificado de Resumen Ejecutivo y Diagnóstico Comercial (Patrón JEV).
 */
export async function generarInformeDiagnosticoJev(businessId: string): Promise<InformeDiagnosticoJev> {
  const ctx: ContextoResumenGlobal = await getContextoResumenGlobal(businessId);

  // Leer acciones abiertas anteriores para no duplicarlas
  const accionesAbiertasPrevias = ctx.accionesAbiertas || [];

  const reportId = `rep-${Date.now()}`;
  const fechaGeneracion = new Date().toISOString();

  // Construir diagnóstico basado en los 5 pilares consolidados (Regla 8)
  const inventarioAlerta = ctx.inventario.alertaCritica;
  const whatsappAlerta = ctx.whatsapp.sinResponder > 0;
  const retencionAlerta = ctx.retencion.enRiesgo > 0;
  const resenasAlerta = ctx.resenas.criticas > 0;
  const pedidosAlerta = ctx.pedidos.retrasados > 0;

  let resumenEjecutivo = `Diagnóstico JEV AI al día: `;
  const hallazgos: string[] = [];

  if (inventarioAlerta) hallazgos.push(`Inventario con ${ctx.inventario.criticos} producto(s) crítico(s) en riesgo de quiebre.`);
  if (whatsappAlerta) hallazgos.push(`WhatsApp con ${ctx.whatsapp.sinResponder} chat(s) sin atender.`);
  if (retencionAlerta) hallazgos.push(`Retención detectó ${ctx.retencion.enRiesgo} cliente(s) en riesgo de abandono (${ctx.retencion.vipsEnRiesgo} VIPs).`);
  if (resenasAlerta) hallazgos.push(`Reputación con ${ctx.resenas.criticas} opinión(es) negativa(s) sin responder.`);
  if (pedidosAlerta) hallazgos.push(`Operación con ${ctx.pedidos.retrasados} pedido(s) demorado(s) superior a 2 horas.`);

  if (hallazgos.length === 0) {
    resumenEjecutivo += `Operación óptima y saludable en todos los pilares. Cero alertas críticas activas.`;
  } else {
    resumenEjecutivo += hallazgos.join(' ');
  }

  // Definir semáforos para los 4 cuadrantes requeridos por la UI
  const visionCaja = {
    status: (ctx.retencion.gastoEnRiesgoTotal > 500000 ? 'yellow' : 'green') as 'green' | 'yellow' | 'red',
    text: `Gasto de clientes en riesgo de abandono: $${(ctx.retencion.gastoEnRiesgoTotal || 0).toLocaleString('es-CO')}.`
  };

  const actividad = {
    status: (ctx.whatsapp.sinResponder > 5 ? 'yellow' : 'green') as 'green' | 'yellow' | 'red',
    text: `Bandeja de WhatsApp con ${ctx.whatsapp.sinResponder || 0} mensaje(s) pendientes de atención.`
  };

  const operacion = {
    status: (pedidosAlerta || inventarioAlerta ? 'red' : 'green') as 'green' | 'yellow' | 'red',
    text: pedidosAlerta ? `Alerta: ${ctx.pedidos.retrasados} pedido(s) retrasados.` : `Despachos e inventario operando con normalidad.`
  };

  const retencion = {
    status: (retencionAlerta ? 'yellow' : 'green') as 'green' | 'yellow' | 'red',
    text: `Tasa de clientes recurrentes bajo supervisión con ${ctx.retencion.enRiesgo || 0} cliente(s) a reconquistar.`
  };

  // Acciones recomendadas (máximo 5)
  const accionesRecomendadas: any[] = [];
  if (inventarioAlerta) {
    accionesRecomendadas.push({ id: `${reportId}_inventario`, pilar: 'inventario', titulo: 'Reabastecer productos en riesgo crítico de quiebre', prioridad: 'High' });
  }
  if (whatsappAlerta) {
    accionesRecomendadas.push({ id: `${reportId}_whatsapp`, pilar: 'whatsapp', titulo: 'Atender mensajes acumulados en WhatsApp', prioridad: 'High' });
  }
  if (retencionAlerta) {
    accionesRecomendadas.push({ id: `${reportId}_retencion`, pilar: 'retencion', titulo: 'Enviar mensajes de reconquista a clientes VIP inactivos', prioridad: 'Medium' });
  }
  if (resenasAlerta) {
    accionesRecomendadas.push({ id: `${reportId}_resenas`, pilar: 'resenas', titulo: 'Responder opiniones críticas en el directorio', prioridad: 'High' });
  }
  if (pedidosAlerta) {
    accionesRecomendadas.push({ id: `${reportId}_pedidos`, pilar: 'pedidos', titulo: 'Revisar y despachar pedidos con demora operativa', prioridad: 'High' });
  }

  // Registrar el informe generado en jev_memory (Regla 6)
  await registrarAccionJev({
    tipo: 'resumen',
    accion: `Generación de informe diagnóstico comercial (${reportId})`,
    datos: {
      reportId,
      estadoGeneral: ctx.estadoGeneral,
      hallazgosCount: hallazgos.length,
    },
    origen: 'jevEngineResumen',
    usuario: businessId,
  });

  return {
    reportId,
    fechaGeneracion,
    estadoGeneral: ctx.estadoGeneral,
    resumenEjecutivo,
    cuadrantes: { visionCaja, actividad, operacion, retencion },
    accionesRecomendadas,
    historialInformes: ctx.historialMemoria.filter(m => m.tipo === 'resumen'),
  };
}

/**
 * Registra o cierra una acción de recomendación desde el informe.
 */
export async function registrarAccionDiagnosticoAplicada({
  businessId,
  pilar,
  titulo,
  reportId,
}: {
  businessId: string;
  pilar: string;
  titulo: string;
  reportId: string;
}) {
  return registrarAccionJev({
    tipo: 'resumen',
    accion: `Acción ejecutada: ${titulo} (${pilar})`,
    datos: { reportId, pilar, resultado: 'aplicado' },
    origen: 'JevDiagnosticoPage',
    usuario: businessId,
  });
}
