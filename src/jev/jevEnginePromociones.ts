'use server';

import { getJevCopilotLimitsInfo, consumeJevCopilotCredit } from './jevLimitsService';

import { getPromocionesContext, ContextoPromociones, PromocionResumenJev } from './contextAggregatorPromociones';
import { registrarAccionJev, cerrarAccionJev } from './jevMemory';

export interface SugerenciaPromocionJev {
  id: string;
  promoId: string;
  titulo: string;
  justificacion: string;
  accionTexto: string;
  tipoAccion: 'renovar_exitosa' | 'revisar_sin_uso' | 'extender_vigencia';
}

export interface CopilotoPromocionesOutput {
  diagnostico: string;
  totalPromociones: number;
  activasCount: number;
  sinUsoCount: number;
  porVencerCount: number;
  todasLasPromociones: PromocionResumenJev[];
  sugerencias: SugerenciaPromocionJev[];
  patronesAprendidos: string[];
  fechaGeneracion: string;
}

/**
 * Motor de IA de JEV para Promociones (Regla 3: Solo propone. Nunca altera promociones por su cuenta).
 */
export async function obtenerCopilotoPromociones(businessId: string): Promise<CopilotoPromocionesOutput> {

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
  

  const contexto: ContextoPromociones = await getPromocionesContext(businessId);

  // Aprendizaje obligatorio de jev_memory (Regla 9)
  const memoriasPrevias = contexto.historialMemoria.filter((m) => m.tipo === 'promociones');
  const patronesAprendidos: string[] = [];

  if (memoriasPrevias.length > 0) {
    patronesAprendidos.push(
      `JEV recuerda ${memoriasPrevias.length} ajuste(s) de promociones gestionados previamente.`
    );
  } else {
    patronesAprendidos.push('Sin historial de promociones previo en memoria.');
  }

  // Generar de 2 a 5 sugerencias accionables
  const sugerencias: SugerenciaPromocionJev[] = [];

  // 1. Sugerencia para renovar la más exitosa
  if (contexto.promocionMasExitosa) {
    const top = contexto.promocionMasExitosa;
    sugerencias.push({
      id: `sug-promo-top-${top.id}`,
      promoId: top.id,
      titulo: `Extender o replicar: "${top.titulo}"`,
      justificacion: `Es tu promoción más efectiva con ${top.usageCount} redenciones exitosas. Conviene mantenerla visible en catálogo y checkout.`,
      accionTexto: 'Priorizar Promoción Estrella',
      tipoAccion: 'renovar_exitosa',
    });
  }

  // 2. Sugerencia para promociones con 0 usos
  const sinUso = contexto.todasLasPromociones.find((p) => p.esSinUso);
  if (sinUso) {
    sugerencias.push({
      id: `sug-promo-zero-${sinUso.id}`,
      promoId: sinUso.id,
      titulo: `Revisar visibilidad de "${sinUso.titulo}"`,
      justificacion: `Está activa pero registra 0 redenciones. Se recomienda verificar si está visible en el catálogo público o aumentar el incentivo.`,
      accionTexto: 'Optimizar Visibilidad de Promo',
      tipoAccion: 'revisar_sin_uso',
    });
  }

  // 3. Sugerencia por vencer
  const porVencer = contexto.todasLasPromociones.find((p) => p.esPorVencer);
  if (porVencer) {
    sugerencias.push({
      id: `sug-promo-exp-${porVencer.id}`,
      promoId: porVencer.id,
      titulo: `Vigencia por expirar: "${porVencer.titulo}"`,
      justificacion: `Vence en ${porVencer.diasRestantes} días. Si está generando ventas, extiende su vigencia por 30 días más.`,
      accionTexto: 'Extender Vigencia',
      tipoAccion: 'extender_vigencia',
    });
  }

  // Diagnóstico fundamentado
  let diagnostico = '';
  if (contexto.porVencerCount > 0) {
    diagnostico = `⚠️ Alerta de vigencia: ${contexto.porVencerCount} promoción(es) vencerán en menos de 7 días.`;
  } else if (contexto.sinUsoCount > 0) {
    diagnostico = `Oportunidad comercial: ${contexto.sinUsoCount} promoción(es) activa(s) registran 0 redenciones hasta el momento.`;
  } else if (contexto.activasCount > 0) {
    diagnostico = `Ofertas activas: ${contexto.activasCount} promociones vigentes con buen nivel de redención en clientes.`;
  } else {
    diagnostico = `Sin promociones activas. Es buen momento para lanzar una oferta relámpago en tu catálogo.`;
  }

  return {
    diagnostico,
    totalPromociones: contexto.totalPromociones,
    activasCount: contexto.activasCount,
    sinUsoCount: contexto.sinUsoCount,
    porVencerCount: contexto.porVencerCount,
    todasLasPromociones: contexto.todasLasPromociones,
    sugerencias,
    patronesAprendidos,
    fechaGeneracion: new Date().toISOString(),
  };
}

/**
 * Consulta en lenguaje natural a JEV sobre promociones.
 */
export async function consultarJevPromociones(businessId: string, pregunta: string): Promise<string> {

  // Validación de límites y consumo atómico para chat (Fase 3 & Bugfix)
  const limitsInfo = await getJevCopilotLimitsInfo(businessId);
  if (!limitsInfo.isModuleActive) {
    return "El módulo JEV Copiloto no está activo para el plan actual de este negocio.";
  }
  if (!limitsInfo.canConsume) {
    return `Has alcanzado el límite diario de consultas (${limitsInfo.usageToday}/${limitsInfo.totalReal}) de JEV Copiloto para hoy. El cupo se reinicia automáticamente mañana o puedes solicitar una ampliación al administrador.`;
  }
  await consumeJevCopilotCredit(businessId);


  const contexto = await getPromocionesContext(businessId);
  const q = (pregunta || '').toLowerCase();

  if (q.includes('mejor') || q.includes('funciona') || q.includes('mas') || q.includes('exitosa')) {
    if (!contexto.promocionMasExitosa) {
      return 'Actualmente ninguna promoción activa ha registrado redenciones significativas.';
    }
    const top = contexto.promocionMasExitosa;
    return `La promoción con mejor rendimiento es "${top.titulo}" con ${top.usageCount} usos registrados (${top.valorDescuento}% de descuento).`;
  }

  if (q.includes('renovar') || q.includes('conviene') || q.includes('extender')) {
    if (contexto.promocionMasExitosa) {
      return `Te conviene renovar "${contexto.promocionMasExitosa.titulo}", ya que lidera el ranking de redenciones del negocio.`;
    }
    return 'Revisa las promociones activas para verificar cuáles atraen más clientes al catálogo.';
  }

  return `Estado de promociones: ${contexto.activasCount} activas de ${contexto.totalPromociones} creadas (${contexto.sinUsoCount} sin usos y ${contexto.porVencerCount} por vencer en <= 7 días).`;
}

/**
 * Registra en jev_memory que el usuario ejecutó/aceptó una sugerencia de promoción.
 */
export async function registrarAccionPromociones({
  businessId,
  promoId,
  titulo,
  justificacion,
}: {
  businessId: string;
  promoId: string;
  titulo: string;
  justificacion: string;
}): Promise<string> {
  return registrarAccionJev({
    tipo: 'promociones',
    accion: `Acción sobre promoción: ${titulo}`,
    datos: {
      referenciaId: promoId,
      sugerenciaJev: titulo,
      justificacion,
      resultado: 'aplicado_por_usuario',
    },
    origen: 'JevCopilotWidgetPromociones',
    usuario: businessId,
  });
}

/**
 * Cierra la acción en memoria.
 */
export async function cerrarAccionPromociones(memoriaId: string, resultado: string) {
  return cerrarAccionJev(memoriaId, resultado);
}
