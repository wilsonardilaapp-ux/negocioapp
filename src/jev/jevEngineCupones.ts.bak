'use server';

import { getJevCopilotLimitsInfo, consumeJevCopilotCredit } from './jevLimitsService';

import { getCuponesContext, ContextoCupones, CuponResumenJev } from './contextAggregatorCupones';
import { registrarAccionJev, cerrarAccionJev } from './jevMemory';

export interface SugerenciaCuponJev {
  id: string;
  cuponId: string;
  codigo: string;
  titulo: string;
  justificacion: string;
  accionTexto: string;
  tipoAccion: 'extender_popular' | 'desactivar_expirado' | 'aumentar_limite';
}

export interface CopilotoCuponesOutput {
  diagnostico: string;
  totalCupones: number;
  activosCount: number;
  expiradosCount: number;
  agotadosCount: number;
  totalUsosGeneral: number;
  todosLosCupones: CuponResumenJev[];
  sugerencias: SugerenciaCuponJev[];
  patronesAprendidos: string[];
  fechaGeneracion: string;
}

/**
 * Motor de IA de JEV para Cupones (Regla 3: Solo propone. Nunca altera cupones por su cuenta).
 */
export async function obtenerCopilotoCupones(businessId: string): Promise<CopilotoCuponesOutput> {

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
  

  const contexto: ContextoCupones = await getCuponesContext(businessId);

  // Aprendizaje obligatorio de jev_memory (Regla 9)
  const memoriasPrevias = contexto.historialMemoria.filter((m) => m.tipo === 'cupones');
  const patronesAprendidos: string[] = [];

  if (memoriasPrevias.length > 0) {
    patronesAprendidos.push(
      `JEV recuerda ${memoriasPrevias.length} ajuste(s) de cupones gestionados previamente.`
    );
  } else {
    patronesAprendidos.push('Sin historial de cupones previo en memoria.');
  }

  // Generar de 2 a 5 sugerencias accionables
  const sugerencias: SugerenciaCuponJev[] = [];

  // 1. Sugerencia para extender el más popular
  if (contexto.cuponMasPopular) {
    const pop = contexto.cuponMasPopular;
    sugerencias.push({
      id: `sug-cup-top-${pop.id}`,
      cuponId: pop.id,
      codigo: pop.codigo,
      titulo: `Extender vigencia del cupón estrella "${pop.codigo}"`,
      justificacion: `Es tu código más redimido con ${pop.usosActuales} usos. Genera recurrencia constante en los pedidos.`,
      accionTexto: 'Ampliar Vigencia',
      tipoAccion: 'extender_popular',
    });
  }

  // 2. Sugerencia para cupones expirados que siguen activos
  const expirado = contexto.todosLosCupones.find((c) => c.esExpirado);
  if (expirado) {
    sugerencias.push({
      id: `sug-cup-exp-${expirado.id}`,
      cuponId: expirado.id,
      codigo: expirado.codigo,
      titulo: `Desactivar cupón vencido: "${expirado.codigo}"`,
      justificacion: `Expiró hace ${Math.abs(expirado.diasRestantes)} días pero sigue marcado como activo en sistema.`,
      accionTexto: 'Dar de Baja Cupón Vencido',
      tipoAccion: 'desactivar_expirado',
    });
  }

  // 3. Sugerencia para cupones agotados por límite
  const agotado = contexto.todosLosCupones.find((c) => c.esAgotado);
  if (agotado) {
    sugerencias.push({
      id: `sug-cup-agot-${agotado.id}`,
      cuponId: agotado.id,
      codigo: agotado.codigo,
      titulo: `Ampliar cupo para cupón agotado: "${agotado.codigo}"`,
      justificacion: `Alcanzó su límite máximo de ${agotado.limiteUsos} usos. Clientes nuevos no podrán aplicarlo.`,
      accionTexto: 'Aumentar Límite de Usos',
      tipoAccion: 'aumentar_limite',
    });
  }

  // Diagnóstico fundamentado
  let diagnostico = '';
  if (contexto.expiradosCount > 0) {
    diagnostico = `⚠️ Alerta de vigencia: ${contexto.expiradosCount} cupón(es) tienen fecha vencida pero continúan marcados como activos.`;
  } else if (contexto.agotadosCount > 0) {
    diagnostico = `Atención de cupo: ${contexto.agotadosCount} cupón(es) alcanzaron su límite máximo de redenciones.`;
  } else if (contexto.totalUsosGeneral > 0) {
    diagnostico = `Cupones en uso activo: ${contexto.activosCount} vigentes con un total de ${contexto.totalUsosGeneral} redenciones en compras.`;
  } else {
    diagnostico = `Cupones configurados sin redenciones recientes. Puedes compartir tu código principal por WhatsApp para incentivar ventas.`;
  }

  return {
    diagnostico,
    totalCupones: contexto.totalCupones,
    activosCount: contexto.activosCount,
    expiradosCount: contexto.expiradosCount,
    agotadosCount: contexto.agotadosCount,
    totalUsosGeneral: contexto.totalUsosGeneral,
    todosLosCupones: contexto.todosLosCupones,
    sugerencias,
    patronesAprendidos,
    fechaGeneracion: new Date().toISOString(),
  };
}

/**
 * Consulta en lenguaje natural a JEV sobre cupones.
 */
export async function consultarJevCupones(businessId: string, pregunta: string): Promise<string> {

  // Validación de límites y consumo atómico para chat (Fase 3 & Bugfix)
  const limitsInfo = await getJevCopilotLimitsInfo(businessId);
  if (!limitsInfo.isModuleActive) {
    return "El módulo JEV Copiloto no está activo para el plan actual de este negocio.";
  }
  if (!limitsInfo.canConsume) {
    return `Has alcanzado el límite diario de consultas (${limitsInfo.usageToday}/${limitsInfo.totalReal}) de JEV Copiloto para hoy. El cupo se reinicia automáticamente mañana o puedes solicitar una ampliación al administrador.`;
  }
  await consumeJevCopilotCredit(businessId);


  const contexto = await getCuponesContext(businessId);
  const q = (pregunta || '').toLowerCase();

  if (q.includes('popular') || q.includes('mas') || q.includes('usado') || q.includes('exitoso')) {
    if (!contexto.cuponMasPopular) {
      return 'Actualmente ningún cupón activo ha registrado redenciones de clientes.';
    }
    const pop = contexto.cuponMasPopular;
    const desc = pop.tipo === 'porcentaje' ? `${pop.valor}%` : `$${pop.valor.toLocaleString('es-CO')}`;
    return `El cupón más popular es "${pop.codigo}" (${desc} de descuento) con ${pop.usosActuales} redenciones exitosas.`;
  }

  if (q.includes('usaron') || q.includes('cuantos') || q.includes('total')) {
    return `Se han registrado un total de ${contexto.totalUsosGeneral} redenciones de cupones en el negocio a través de ${contexto.activosCount} códigos activos.`;
  }

  if (q.includes('expirado') || q.includes('vencido') || q.includes('caducado')) {
    if (contexto.expiradosCount === 0) {
      return 'Todos los cupones activos se encuentran dentro de su fecha de vigencia válida.';
    }
    const expNombres = contexto.todosLosCupones.filter((c) => c.esExpirado).map((c) => c.codigo).join(', ');
    return `Cupones con fecha vencida (${contexto.expiradosCount}): ${expNombres}. Se sugiere desactivarlos para evitar confusiones.`;
  }

  return `Estado de cupones: ${contexto.activosCount} activos, ${contexto.totalUsosGeneral} usos registrados y ${contexto.expiradosCount} con fecha expirada.`;
}

/**
 * Registra en jev_memory que el usuario ejecutó/aceptó una sugerencia de cupón.
 */
export async function registrarAccionCupones({
  businessId,
  cuponId,
  codigo,
  accion,
  justificacion,
}: {
  businessId: string;
  cuponId: string;
  codigo: string;
  accion: string;
  justificacion: string;
}): Promise<string> {
  return registrarAccionJev({
    tipo: 'cupones',
    accion: `Acción sobre cupón: ${accion} (${codigo})`,
    datos: {
      referenciaId: cuponId,
      codigo,
      sugerenciaJev: accion,
      justificacion,
      resultado: 'aplicado_por_usuario',
    },
    origen: 'JevCopilotWidgetCupones',
    usuario: businessId,
  });
}

/**
 * Cierra la acción en memoria.
 */
export async function cerrarAccionCupones(memoriaId: string, resultado: string) {
  return cerrarAccionJev(memoriaId, resultado);
}
