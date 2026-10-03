'use server';

import { getJevCopilotLimitsInfo, consumeJevCopilotCredit } from './jevLimitsService';

import { getSuggestionsContext, ContextoSuggestions, ReglaSugerenciaJev } from './contextAggregatorSuggestions';
import { registrarAccionJev, cerrarAccionJev } from './jevMemory';

export interface SugerenciaMotorJev {
  id: string;
  reglaId: string;
  titulo: string;
  justificacion: string;
  accionTexto: string;
  tipoAccion: 'optimizar_regla' | 'crear_regla' | 'sincronizar_analitica';
}

export interface CopilotoSuggestionsOutput {
  diagnostico: string;
  totalReglas: number;
  activasCount: number;
  totalMostradas: number;
  totalAceptadas: number;
  tasaConversionGlobal: number;
  ingresosAtribuidosTotal: number;
  reglas: ReglaSugerenciaJev[];
  sugerencias: SugerenciaMotorJev[];
  patronesAprendidos: string[];
  fechaGeneracion: string;
}

/**
 * Motor de IA de JEV para Sugerencias Inteligentes (Regla 3: Solo propone. Nunca modifica reglas de cross-sell por su cuenta).
 */
export async function obtenerCopilotoSuggestions(businessId: string): Promise<CopilotoSuggestionsOutput> {

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
  

  const contexto: ContextoSuggestions = await getSuggestionsContext(businessId);

  // Aprendizaje obligatorio de jev_memory (Regla 9)
  const memoriasPrevias = contexto.historialMemoria.filter((m) => m.tipo === 'sugerencias');
  const patronesAprendidos: string[] = [];

  if (memoriasPrevias.length > 0) {
    patronesAprendidos.push(
      `JEV recuerda ${memoriasPrevias.length} acción(es) de optimización de cross-sell registradas previamente.`
    );
  } else {
    patronesAprendidos.push('Sin historial de optimización previo en memoria. JEV evaluará el motor actual.');
  }

  // Generar de 2 a 5 sugerencias accionables
  const sugerencias: SugerenciaMotorJev[] = [];

  // 1. Sugerencia para reglas sin resultados
  const sinResultado = contexto.reglas.find((r) => r.esSinResultados);
  if (sinResultado) {
    sugerencias.push({
      id: `sug-sug-zero-${sinResultado.id}`,
      reglaId: sinResultado.id,
      titulo: `Optimizar regla con baja conversión`,
      justificacion: `La regla #${sinResultado.id.slice(-4)} tiene ${sinResultado.shownCount} visualizaciones pero 0 aceptaciones. Se sugiere cambiar el producto sugerido.`,
      accionTexto: 'Ajustar Configuración de Regla',
      tipoAccion: 'optimizar_regla',
    });
  }

  // 2. Sugerencia si hay pocas reglas
  if (contexto.totalReglas < 3) {
    sugerencias.push({
      id: 'sug-sug-create',
      reglaId: 'nueva',
      titulo: 'Crear nueva regla de cross-sell / upsell',
      justificacion: `Tienes ${contexto.totalReglas} regla(s) configurada(s). Ampliar las combinaciones aumenta el ticket promedio por cliente.`,
      accionTexto: 'Crear Nueva Regla',
      tipoAccion: 'crear_regla',
    });
  }

  // 3. Sugerencia de sincronización analítica
  sugerencias.push({
    id: 'sug-sug-sync',
    reglaId: 'sync',
    titulo: 'Sincronizar métricas del motor con pedidos recientes',
    justificacion: 'Actualiza los contadores de conversiones cruzando el motor de cross-sell con las transacciones de ventas.',
    accionTexto: 'Sincronizar Analítica',
    tipoAccion: 'sincronizar_analitica',
  });

  // Diagnóstico fundamentado (con honradez de datos aunque sea $0 / 0%)
  let diagnostico = '';
  if (contexto.totalReglas === 0) {
    diagnostico = `Motor sin reglas configuradas. Aún no se generan sugerencias de cross-sell para los clientes en el checkout.`;
  } else if (contexto.totalMostradas === 0) {
    diagnostico = `El motor lleva activo con ${contexto.activasCount} regla(s), pero aún no registra visualizaciones en el checkout ($0 en ingresos atribuidos).`;
  } else {
    diagnostico = `Motor activo: ${contexto.totalMostradas} visualizaciones, ${contexto.totalAceptadas} aceptación(es) y $${contexto.ingresosAtribuidosTotal.toLocaleString('es-CO')} en ingresos atribuibles (Tasa de conversión: ${contexto.tasaConversionGlobal}%).`;
  }

  return {
    diagnostico,
    totalReglas: contexto.totalReglas,
    activasCount: contexto.activasCount,
    totalMostradas: contexto.totalMostradas,
    totalAceptadas: contexto.totalAceptadas,
    tasaConversionGlobal: contexto.tasaConversionGlobal,
    ingresosAtribuidosTotal: contexto.ingresosAtribuidosTotal,
    reglas: contexto.reglas,
    sugerencias,
    patronesAprendidos,
    fechaGeneracion: new Date().toISOString(),
  };
}

/**
 * Consulta en lenguaje natural a JEV sobre sugerencias.
 */
export async function consultarJevSuggestions(businessId: string, pregunta: string): Promise<string> {

  // Validación de límites y consumo atómico para chat (Fase 3 & Bugfix)
  const limitsInfo = await getJevCopilotLimitsInfo(businessId);
  if (!limitsInfo.isModuleActive) {
    return "El módulo JEV Copiloto no está activo para el plan actual de este negocio.";
  }
  if (!limitsInfo.canConsume) {
    return `Has alcanzado el límite diario de consultas (${limitsInfo.usageToday}/${limitsInfo.totalReal}) de JEV Copiloto para hoy. El cupo se reinicia automáticamente mañana o puedes solicitar una ampliación al administrador.`;
  }
  await consumeJevCopilotCredit(businessId);


  const contexto = await getSuggestionsContext(businessId);
  const q = (pregunta || '').toLowerCase();

  if (q.includes('aceptaron') || q.includes('cuantas') || q.includes('aceptadas')) {
    return `Se han aceptado ${contexto.totalAceptadas} sugerencias de cross-sell de un total de ${contexto.totalMostradas} visualizaciones en el checkout.`;
  }

  if (q.includes('convierte') || q.includes('mejor') || q.includes('rendimiento')) {
    if (contexto.reglas.length === 0 || contexto.tasaConversionGlobal === 0) {
      return 'El motor aún no genera conversiones suficientes para determinar la regla con mayor tasa de éxito.';
    }
    const top = [...contexto.reglas].sort((a, b) => b.tasaConversion - a.tasaConversion)[0];
    return `La regla con mayor conversión registra una tasa del ${top.tasaConversion}% con ${top.acceptedCount} aceptaciones.`;
  }

  if (q.includes('upsell') || q.includes('producto') || q.includes('sugerir')) {
    return 'Se recomienda sugerir productos complementarios de alta rotación (ej. bebidas, postres o accesorios) que no superen el 30% del valor del producto principal.';
  }

  return `Rendimiento del motor: ${contexto.totalMostradas} mostradas, ${contexto.totalAceptadas} aceptadas (${contexto.tasaConversionGlobal}% de conversión, $${contexto.ingresosAtribuidosTotal.toLocaleString('es-CO')} atribuidos).`;
}

/**
 * Registra en jev_memory que el usuario ejecutó/aceptó una sugerencia de optimización.
 */
export async function registrarAccionSuggestions({
  businessId,
  reglaId,
  titulo,
  justificacion,
}: {
  businessId: string;
  reglaId: string;
  titulo: string;
  justificacion: string;
}): Promise<string> {
  return registrarAccionJev({
    tipo: 'sugerencias',
    accion: `Optimización de motor: ${titulo}`,
    datos: {
      referenciaId: reglaId,
      sugerenciaJev: titulo,
      justificacion,
      resultado: 'aplicado_por_usuario',
    },
    origen: 'JevCopilotWidgetSuggestions',
    usuario: businessId,
  });
}

/**
 * Cierra la acción en memoria.
 */
export async function cerrarAccionSuggestions(memoriaId: string, resultado: string) {
  return cerrarAccionJev(memoriaId, resultado);
}
