import { getMetricasPilarWhatsapp } from './contextAggregatorWhatsapp';
import { getMetricasPilarInventario } from './contextAggregatorInventario';
import { getMetricasPilarRetencion } from './contextAggregatorRetencion';
import { getMetricasPilarResenas } from './contextAggregatorResenas';
import { getMetricasPilarPedidos } from './contextAggregatorPedidos';
import { obtenerAccionesJev } from './jevMemory';

export interface ContextoResumenGlobal {
  businessId: string;
  whatsapp: any;
  inventario: any;
  retencion: any;
  resenas: any;
  pedidos: any;
  historialMemoria: any[];
  accionesAbiertas: any[];
  estadoGeneral: string;
  fechaGeneracion: string;
}

/**
 * Agregador central del Resumen Ejecutivo (SOLO LECTURA).
 * Si un pilar no tiene datos, retorna explícitamente "SIN DATOS".
 */
export async function getContextoResumenGlobal(businessId: string): Promise<ContextoResumenGlobal> {
  if (!businessId || typeof businessId !== 'string') {
    throw new Error('[JEV CONTEXT RESUMEN] businessId es obligatorio.');
  }

  const formatPilar = (res: any, fallbackLabel: string) => {
    if (!res || res.estado === 'sin_datos' || (res.total === 0 && res.sinResponder === 0 && res.criticos === 0 && res.enRiesgo === 0 && res.activos === 0)) {
      return { ...res, estadoTexto: 'SIN DATOS', esSinDatos: true };
    }
    return { ...res, estadoTexto: res.estado || 'ATENCIÓN REQUERIDA', esSinDatos: false };
  };

  try {
    const [whatsappRaw, inventarioRaw, retencionRaw, resenasRaw, pedidosRaw, historialMemoria, accionesAbiertas] = await Promise.all([
      getMetricasPilarWhatsapp(businessId).catch(() => ({ estado: 'sin_datos' })),
      getMetricasPilarInventario(businessId).catch(() => ({ estado: 'sin_datos' })),
      getMetricasPilarRetencion(businessId).catch(() => ({ estado: 'sin_datos' })),
      getMetricasPilarResenas(businessId).catch(() => ({ estado: 'sin_datos' })),
      getMetricasPilarPedidos(businessId).catch(() => ({ estado: 'sin_datos' })),
      obtenerAccionesJev({ usuario: businessId, limite: 20 }).catch(() => []),
      obtenerAccionesJev({ usuario: businessId, tipo: 'resumen', estado: 'abierta' }).catch(() => []),
    ]);

    const whatsapp = formatPilar(whatsappRaw, 'WhatsApp');
    const inventario = formatPilar(inventarioRaw, 'Inventario');
    const retencion = formatPilar(retencionRaw, 'Retención');
    const resenas = formatPilar(resenasRaw, 'Reseñas');
    const pedidos = formatPilar(pedidosRaw, 'Pedidos');

    const pilares = [whatsapp, inventario, retencion, resenas, pedidos];
    const tieneCritico = pilares.some((p: any) => p.alertaCritica || p.estado === 'critico');
    const tieneAtencion = pilares.some((p: any) => p.estado === 'atencion_requerida');

    let estadoGeneral = 'ÓPTIMO';
    if (tieneCritico) estadoGeneral = 'CRÍTICO';
    else if (tieneAtencion) estadoGeneral = 'ATENCIÓN REQUERIDA';

    return {
      businessId,
      whatsapp,
      inventario,
      retencion,
      resenas,
      pedidos,
      historialMemoria,
      accionesAbiertas,
      estadoGeneral,
      fechaGeneracion: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('[JEV CONTEXT RESUMEN] Error:', error);
    return {
      businessId,
      whatsapp: { estadoTexto: 'SIN DATOS', esSinDatos: true },
      inventario: { estadoTexto: 'SIN DATOS', esSinDatos: true },
      retencion: { estadoTexto: 'SIN DATOS', esSinDatos: true },
      resenas: { estadoTexto: 'SIN DATOS', esSinDatos: true },
      pedidos: { estadoTexto: 'SIN DATOS', esSinDatos: true },
      historialMemoria: [],
      accionesAbiertas: [],
      estadoGeneral: 'SIN DATOS',
      fechaGeneracion: new Date().toISOString(),
    };
  }
}
