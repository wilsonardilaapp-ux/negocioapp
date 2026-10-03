'use server';

import { getJevCopilotLimitsInfo, consumeJevCopilotCredit } from './jevLimitsService';

import { getVencimientosContext, ContextoVencimientos, LoteVencimientoJev } from './contextAggregatorVencimientos';
import { registrarAccionJev, cerrarAccionJev } from './jevMemory';

export interface SugerenciaVencimientoJev {
  id: string;
  loteId: string;
  producto: string;
  cantidad: number;
  diasRestantes: number;
  titulo: string;
  justificacion: string;
  accionTexto: string;
  tipoAccion: 'promocion_remate' | 'retiro_estanteria' | 'rotacion_preventiva';
}

export interface CopilotoVencimientosOutput {
  diagnostico: string;
  totalLotes: number;
  vencidosCount: number;
  criticosCount: number;
  proximosCount: number;
  lotesCriticos: LoteVencimientoJev[];
  lotesVencidos: LoteVencimientoJev[];
  sugerencias: SugerenciaVencimientoJev[];
  patronesAprendidos: string[];
  fechaGeneracion: string;
}

/**
 * Motor de IA de JEV para Vencimientos (Regla 3: Solo propone. Nunca modifica lotes por su cuenta).
 */
export async function obtenerCopilotoVencimientos(businessId: string): Promise<CopilotoVencimientosOutput> {

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
  

  const contexto: ContextoVencimientos = await getVencimientosContext(businessId);

  // Aprendizaje obligatorio de jev_memory (Regla 9)
  const accionesPrevias = contexto.historialMemoria.filter((m) => m.tipo === 'vencimientos');
  const patronesAprendidos: string[] = [];

  if (accionesPrevias.length > 0) {
    patronesAprendidos.push(
      `JEV recuerda ${accionesPrevias.length} acción(es) de prevención de caducidad registradas anteriormente.`
    );
  } else {
    patronesAprendidos.push('Sin historial de vencimientos previo en memoria. JEV aprenderá con los registros de hoy.');
  }

  // Generar de 2 a 5 sugerencias accionables
  const sugerencias: SugerenciaVencimientoJev[] = [];

  // 1. Sugerencias para lotes ya vencidos
  if (contexto.lotesVencidos.length > 0) {
    const v = contexto.lotesVencidos[0];
    sugerencias.push({
      id: `sug-venc-${v.id}`,
      loteId: v.id,
      producto: v.productoNombre,
      cantidad: v.quantity,
      diasRestantes: v.diasRestantes,
      titulo: `Retirar de exhibición: ${v.productoNombre} (${v.quantity} unids)`,
      justificacion: `Lote vencido hace ${Math.abs(v.diasRestantes)} días (Lote: #${v.batchNumber || 'S/N'}). Debe darse de baja para evitar reclamos.`,
      accionTexto: 'Registrar Retiro de Inventario',
      tipoAccion: 'retiro_estanteria',
    });
  }

  // 2. Sugerencias para lotes críticos (próximos a vencer en <= 7 días)
  if (contexto.lotesCriticos.length > 0) {
    const c = contexto.lotesCriticos[0];
    sugerencias.push({
      id: `sug-crit-${c.id}`,
      loteId: c.id,
      producto: c.productoNombre,
      cantidad: c.quantity,
      diasRestantes: c.diasRestantes,
      titulo: `Promoción relámpago para: ${c.productoNombre}`,
      justificacion: `Vence en ${c.diasRestantes} días (${c.quantity} unidades en stock). Se sugiere descuento del 30% para liquidar existencias.`,
      accionTexto: 'Lanzar Oferta de Liquidación',
      tipoAccion: 'promocion_remate',
    });
  }

  // 3. Sugerencia preventiva (<= 30 días)
  if (contexto.lotesProximos.length > 0) {
    const p = contexto.lotesProximos[0];
    sugerencias.push({
      id: `sug-prox-${p.id}`,
      loteId: p.id,
      producto: p.productoNombre,
      cantidad: p.quantity,
      diasRestantes: p.diasRestantes,
      titulo: `Priorizar venta de primer lote: ${p.productoNombre}`,
      justificacion: `Vence en ${p.diasRestantes} días. Ubicar al frente en bodega aplicando método PEPS (Primeras Entradas, Primeras Salidas).`,
      accionTexto: 'Aplicar Rotación Preventiva',
      tipoAccion: 'rotacion_preventiva',
    });
  }

  // Diagnóstico fundamentado
  let diagnostico = '';
  if (contexto.vencidosCount > 0) {
    diagnostico = `⚠️ Alerta de caducidad: ${contexto.vencidosCount} lote(s) ya han superado su fecha de vencimiento y ${contexto.criticosCount} están en rango crítico (<= 7 días).`;
  } else if (contexto.criticosCount > 0) {
    diagnostico = `Atención preventiva: ${contexto.criticosCount} lote(s) vencerán en menos de 7 días. Requieren oferta de salida rápida.`;
  } else if (contexto.proximosCount > 0) {
    diagnostico = `Seguimiento activo: ${contexto.proximosCount} lote(s) tienen fecha de vencimiento en los próximos 30 días.`;
  } else {
    diagnostico = `Todos los lotes en buen estado. Cobertura de caducidad superior a 30 días para todos los productos registrados.`;
  }

  return {
    diagnostico,
    totalLotes: contexto.totalLotes,
    vencidosCount: contexto.vencidosCount,
    criticosCount: contexto.criticosCount,
    proximosCount: contexto.proximosCount,
    lotesCriticos: contexto.lotesCriticos,
    lotesVencidos: contexto.lotesVencidos,
    sugerencias,
    patronesAprendidos,
    fechaGeneracion: new Date().toISOString(),
  };
}

/**
 * Consulta en lenguaje natural a JEV sobre vencimientos.
 */
export async function consultarJevVencimientos(businessId: string, pregunta: string): Promise<string> {

  // Validación de límites y consumo atómico para chat (Fase 3 & Bugfix)
  const limitsInfo = await getJevCopilotLimitsInfo(businessId);
  if (!limitsInfo.isModuleActive) {
    return "El módulo JEV Copiloto no está activo para el plan actual de este negocio.";
  }
  if (!limitsInfo.canConsume) {
    return `Has alcanzado el límite diario de consultas (${limitsInfo.usageToday}/${limitsInfo.totalReal}) de JEV Copiloto para hoy. El cupo se reinicia automáticamente mañana o puedes solicitar una ampliación al administrador.`;
  }
  await consumeJevCopilotCredit(businessId);


  const contexto = await getVencimientosContext(businessId);
  const q = (pregunta || '').toLowerCase();

  if (q.includes('vencido') || q.includes('caducado') || q.includes('pasado')) {
    if (contexto.lotesVencidos.length === 0) {
      return 'Actualmente no tienes ningún lote vencido en inventario.';
    }
    const nombres = contexto.lotesVencidos.map((l) => `"${l.productoNombre}" (${l.quantity} unids, venció hace ${Math.abs(l.diasRestantes)}d)`).join(', ');
    return `Lotes vencidos detectados (${contexto.vencidosCount}): ${nombres}. Se recomienda retirarlos inmediatamente.`;
  }

  if (q.includes('semana') || q.includes('critico') || q.includes('urgente') || q.includes('7 dias')) {
    if (contexto.lotesCriticos.length === 0) {
      return 'No hay productos con vencimiento en los próximos 7 días.';
    }
    const c = contexto.lotesCriticos[0];
    return `Lote más urgente: "${c.productoNombre}" (${c.quantity} unidades, vence en ${c.diasRestantes} días). Se recomienda aplicar descuento relámpago.`;
  }

  if (q.includes('cantidad') || q.includes('cuanto') || q.includes('riesgo')) {
    const totalUnidades = [...contexto.lotesVencidos, ...contexto.lotesCriticos].reduce((a, b) => a + b.quantity, 0);
    return `Total de unidades en riesgo inmediato (vencidas o a vencer en <= 7 días): ${totalUnidades} unidades en ${contexto.vencidosCount + contexto.criticosCount} lote(s).`;
  }

  return `Estado de caducidades: ${contexto.vencidosCount} vencidos, ${contexto.criticosCount} críticos (<=7d) y ${contexto.proximosCount} próximos (<=30d).`;
}

/**
 * Registra en jev_memory que el usuario ejecutó/aceptó una sugerencia de vencimiento.
 */
export async function registrarAccionVencimientos({
  businessId,
  loteId,
  producto,
  accion,
  detalle,
}: {
  businessId: string;
  loteId: string;
  producto: string;
  accion: string;
  detalle: string;
}): Promise<string> {
  return registrarAccionJev({
    tipo: 'vencimientos',
    accion: `Acción sobre vencimiento: ${accion} en ${producto}`,
    datos: {
      referenciaId: loteId,
      producto,
      sugerenciaJev: accion,
      detalle,
      resultado: 'aplicado_por_usuario',
    },
    origen: 'JevCopilotWidgetVencimientos',
    usuario: businessId,
  });
}

/**
 * Cierra la acción en memoria.
 */
export async function cerrarAccionVencimientos(memoriaId: string, resultado: string) {
  return cerrarAccionJev(memoriaId, resultado);
}
