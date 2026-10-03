'use server';

import { getJevCopilotLimitsInfo, consumeJevCopilotCredit } from './jevLimitsService';

import { getContabilidadContext, ContextoContabilidad, AsientoResumenJev } from './contextAggregatorContabilidad';
import { registrarAccionJev, cerrarAccionJev } from './jevMemory';

export interface SugerenciaContable {
  id: string;
  titulo: string;
  justificacion: string;
  accionTexto: string;
  asientoRelacionado?: string;
  tipoAccion: 'corregir_descuadre' | 'documentar' | 'conciliar' | 'revision';
}

export interface CopilotoContabilidadOutput {
  diagnostico: string;
  totalAsientosMes: number;
  totalDebitosMes: number;
  totalCreditosMes: number;
  balanceNetoMes: number;
  descuadradosCount: number;
  sinReferenciaCount: number;
  asientosDescuadrados: AsientoResumenJev[];
  sugerencias: SugerenciaContable[];
  patronesAprendidos: string[];
  fechaGeneracion: string;
}

/**
 * Motor de IA de JEV para Contabilidad (Regla 3: Solo propone. Nunca modifica asientos).
 */
export async function obtenerCopilotoContabilidad(businessId: string): Promise<CopilotoContabilidadOutput> {

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
  

  const contexto: ContextoContabilidad = await getContabilidadContext(businessId);

  // Aprendizaje obligatorio de jev_memory (Regla 9)
  const memoriasPrevias = contexto.historialMemoria.filter((m) => m.tipo === 'contabilidad');
  const patronesAprendidos: string[] = [];

  if (memoriasPrevias.length > 0) {
    patronesAprendidos.push(
      `JEV recuerda ${memoriasPrevias.length} sugerencia(s) contables revisadas previamente.`
    );
  } else {
    patronesAprendidos.push('Sin historial de ajustes contables previo. JEV aprenderá con los registros de hoy.');
  }

  // Generar de 2 a 5 sugerencias accionables basadas en datos reales
  const sugerencias: SugerenciaContable[] = [];

  // Sugerencia 1: Corregir asientos descuadrados
  if (contexto.asientosDescuadrados.length > 0) {
    const primerDescuadre = contexto.asientosDescuadrados[0];
    const diferencia = Math.abs(primerDescuadre.totalDebitos - primerDescuadre.totalCreditos);
    sugerencias.push({
      id: `sug-desc-${primerDescuadre.id}`,
      titulo: `Corregir descuadre en asiento: "${primerDescuadre.concepto}"`,
      justificacion: `Débitos ($${primerDescuadre.totalDebitos.toLocaleString('es-CO')}) no coinciden con Créditos ($${primerDescuadre.totalCreditos.toLocaleString('es-CO')}). Descuadre: $${diferencia.toLocaleString('es-CO')}.`,
      accionTexto: 'Revisar Partida Descuadrada',
      asientoRelacionado: primerDescuadre.id,
      tipoAccion: 'corregir_descuadre',
    });
  }

  // Sugerencia 2: Documentación de comprobantes
  if (contexto.asientosSinReferencia.length > 0) {
    sugerencias.push({
      id: 'sug-soporte-facturas',
      titulo: 'Adjuntar documento soporte a asientos huérfanos',
      justificacion: `Hay ${contexto.asientosSinReferencia.length} asiento(s) registrados sin número de factura o documento de soporte.`,
      accionTexto: 'Clasificar Documentos Soporte',
      tipoAccion: 'documentar',
    });
  }

  // Sugerencia 3: Conciliación de balance
  if (contexto.totalAsientosMes > 0) {
    sugerencias.push({
      id: 'sug-conciliacion-mes',
      titulo: 'Conciliar saldos del mes en curso',
      justificacion: `Se registran ${contexto.totalAsientosMes} movimientos este mes con débitos por $${contexto.totalDebitosMes.toLocaleString('es-CO')}.`,
      accionTexto: 'Proceder a Conciliación',
      tipoAccion: 'conciliar',
    });
  }

  // Diagnóstico fundamentado
  let diagnostico = '';
  if (contexto.asientosDescuadrados.length > 0) {
    diagnostico = `⚠️ Alerta contable: Se detectaron ${contexto.asientosDescuadrados.length} asiento(s) descuadrados que impiden un balance exacto.`;
  } else if (contexto.totalAsientosMes > 0) {
    diagnostico = `Contabilidad al día. ${contexto.totalAsientosMes} asientos registrados en el mes con balance equilibrado entre débitos y créditos.`;
  } else {
    diagnostico = `Sin asientos registrados este mes. El balance contable está a la espera de nuevos movimientos.`;
  }

  return {
    diagnostico,
    totalAsientosMes: contexto.totalAsientosMes,
    totalDebitosMes: contexto.totalDebitosMes,
    totalCreditosMes: contexto.totalCreditosMes,
    balanceNetoMes: contexto.balanceNetoMes,
    descuadradosCount: contexto.asientosDescuadrados.length,
    sinReferenciaCount: contexto.asientosSinReferencia.length,
    asientosDescuadrados: contexto.asientosDescuadrados,
    sugerencias,
    patronesAprendidos,
    fechaGeneracion: new Date().toISOString(),
  };
}

/**
 * Consulta en lenguaje natural a JEV sobre contabilidad.
 */
export async function consultarJevContabilidad(businessId: string, pregunta: string): Promise<string> {

  // Validación de límites y consumo atómico para chat (Fase 3 & Bugfix)
  const limitsInfo = await getJevCopilotLimitsInfo(businessId);
  if (!limitsInfo.isModuleActive) {
    return "El módulo JEV Copiloto no está activo para el plan actual de este negocio.";
  }
  if (!limitsInfo.canConsume) {
    return `Has alcanzado el límite diario de consultas (${limitsInfo.usageToday}/${limitsInfo.totalReal}) de JEV Copiloto para hoy. El cupo se reinicia automáticamente mañana o puedes solicitar una ampliación al administrador.`;
  }
  await consumeJevCopilotCredit(businessId);


  const contexto = await getContabilidadContext(businessId);
  const q = (pregunta || '').toLowerCase();

  if (q.includes('descuadrado') || q.includes('partida') || q.includes('error')) {
    if (contexto.asientosDescuadrados.length === 0) {
      return 'Todos los asientos registrados se encuentran perfectamente cuadrados (débitos = créditos).';
    }
    const a = contexto.asientosDescuadrados[0];
    return `Hay ${contexto.asientosDescuadrados.length} asiento(s) descuadrado(s). El más prioritario es "${a.concepto}" (Débitos: $${a.totalDebitos.toLocaleString('es-CO')}, Créditos: $${a.totalCreditos.toLocaleString('es-CO')}).`;
  }

  if (q.includes('gasté') || q.includes('gasto') || q.includes('debitos') || q.includes('egreso')) {
    return `Débitos acumulados del mes en curso: $${contexto.totalDebitosMes.toLocaleString('es-CO')} en ${contexto.totalAsientosMes} asientos.`;
  }

  if (q.includes('balance') || q.includes('neto') || q.includes('saldo')) {
    return `Balance del mes: Débitos $${contexto.totalDebitosMes.toLocaleString('es-CO')} vs Créditos $${contexto.totalCreditosMes.toLocaleString('es-CO')} (Diferencia neta: $${contexto.balanceNetoMes.toLocaleString('es-CO')}).`;
  }

  return `Diagnóstico contable: ${contexto.totalAsientosMes} asientos en el mes, ${contexto.asientosDescuadrados.length} descuadrados y ${contexto.asientosSinReferencia.length} sin documento de soporte.`;
}

/**
 * Registra en jev_memory que el usuario ejecutó/aceptó una sugerencia contable.
 */
export async function registrarSugerenciaContableAplicada({
  businessId,
  sugerenciaId,
  titulo,
  justificacion,
}: {
  businessId: string;
  sugerenciaId: string;
  titulo: string;
  justificacion: string;
}): Promise<string> {
  return registrarAccionJev({
    tipo: 'contabilidad',
    accion: `Sugerencia contable aceptada: ${titulo}`,
    datos: {
      referenciaId: sugerenciaId,
      sugerenciaJev: titulo,
      justificacion,
      resultado: 'aplicado_por_usuario',
    },
    origen: 'JevCopilotWidgetContabilidad',
    usuario: businessId,
  });
}

/**
 * Cierra la acción en memoria.
 */
export async function cerrarAccionContabilidad(memoriaId: string, resultado: string) {
  return cerrarAccionJev(memoriaId, resultado);
}
