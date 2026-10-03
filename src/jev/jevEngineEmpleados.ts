'use server';

import { getJevCopilotLimitsInfo, consumeJevCopilotCredit } from './jevLimitsService';

import { getEmpleadosContext, ContextoEmpleados, ColaboradorEquipoJev } from './contextAggregatorEmpleados';
import { registrarAccionJev, cerrarAccionJev } from './jevMemory';

export interface SugerenciaEquipoJev {
  id: string;
  colaboradorId: string;
  nombre: string;
  titulo: string;
  justificacion: string;
  accionTexto: string;
  tipoAccion: 'asignar_servicios' | 'reactivar_colaborador' | 'balancear_carga';
}

export interface CopilotoEmpleadosOutput {
  diagnostico: string;
  totalColaboradores: number;
  activosCount: number;
  inactivosCount: number;
  sinServiciosCount: number;
  colaboradores: ColaboradorEquipoJev[];
  sugerencias: SugerenciaEquipoJev[];
  patronesAprendidos: string[];
  fechaGeneracion: string;
}

/**
 * Motor de IA de JEV para Equipo y Colaboradores (Regla 3: Solo propone. Nunca altera miembros de equipo).
 */
export async function obtenerCopilotoEmpleados(businessId: string): Promise<CopilotoEmpleadosOutput> {

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
  

  const contexto: ContextoEmpleados = await getEmpleadosContext(businessId);

  // Aprendizaje obligatorio de jev_memory (Regla 9)
  const memoriasPrevias = contexto.historialMemoria.filter((m) => m.tipo === 'empleados');
  const patronesAprendidos: string[] = [];

  if (memoriasPrevias.length > 0) {
    patronesAprendidos.push(
      `JEV recuerda ${memoriasPrevias.length} ajuste(s) de equipo registrados previamente.`
    );
  } else {
    patronesAprendidos.push('Sin historial de asignaciones de equipo previo en memoria.');
  }

  // Generar de 2 a 5 sugerencias accionables
  const sugerencias: SugerenciaEquipoJev[] = [];

  // 1. Colaboradores sin servicios asignados
  const sinServicio = contexto.colaboradores.find((c) => c.serviciosAsignadosCount === 0 && c.isActive);
  if (sinServicio) {
    sugerencias.push({
      id: `sug-staff-noserv-${sinServicio.id}`,
      colaboradorId: sinServicio.id,
      nombre: sinServicio.nombre,
      titulo: `Asignar catálogo de servicios a ${sinServicio.nombre}`,
      justificacion: `${sinServicio.nombre} (${sinServicio.especialidad}) está activo pero tiene 0 servicios asignados, por lo que los clientes no pueden agendar citas con él/ella.`,
      accionTexto: 'Configurar Servicios Asignados',
      tipoAccion: 'asignar_servicios',
    });
  }

  // 2. Colaboradores inactivos
  const inactivo = contexto.colaboradores.find((c) => !c.isActive);
  if (inactivo) {
    sugerencias.push({
      id: `sug-staff-inact-${inactivo.id}`,
      colaboradorId: inactivo.id,
      nombre: inactivo.nombre,
      titulo: `Revisar estado de disponibilidad de ${inactivo.nombre}`,
      justificacion: `${inactivo.nombre} se encuentra marcado como inactivo. Si ya está disponible para atender clientes, reactiva su perfil.`,
      accionTexto: 'Revisar Disponibilidad',
      tipoAccion: 'reactivar_colaborador',
    });
  }

  // 3. Balancear carga de trabajo
  const sobrecargado = contexto.colaboradores.find((c) => c.nivelCarga === 'alta');
  if (sobrecargado) {
    sugerencias.push({
      id: `sug-staff-overload-${sobrecargado.id}`,
      colaboradorId: sobrecargado.id,
      nombre: sobrecargado.nombre,
      titulo: `Balancear especialidades para ${sobrecargado.nombre}`,
      justificacion: `Tiene ${sobrecargado.serviciosAsignadosCount} servicios asignados. Distribuir parte de la oferta en otros miembros alivia la saturación de agenda.`,
      accionTexto: 'Revisar Asignaciones Cruzadas',
      tipoAccion: 'balancear_carga',
    });
  }

  // Diagnóstico fundamentado
  let diagnostico = '';
  if (contexto.sinServiciosCount > 0) {
    diagnostico = `⚠️ Atención requerida: ${contexto.sinServiciosCount} colaborador(es) activo(s) no tienen ningún servicio asignado para reservas.`;
  } else if (contexto.inactivosCount > 0) {
    diagnostico = `Equipo operativo: ${contexto.activosCount} profesional(es) activos y ${contexto.inactivosCount} inactivo(s). Servicios disponibles: ${contexto.totalServiciosDisponibles}.`;
  } else {
    diagnostico = `Equipo 100% activo. Todos los ${contexto.totalColaboradores} colaboradores tienen servicios asignados y están disponibles para agendamiento.`;
  }

  return {
    diagnostico,
    totalColaboradores: contexto.totalColaboradores,
    activosCount: contexto.activosCount,
    inactivosCount: contexto.inactivosCount,
    sinServiciosCount: contexto.sinServiciosCount,
    colaboradores: contexto.colaboradores,
    sugerencias,
    patronesAprendidos,
    fechaGeneracion: new Date().toISOString(),
  };
}

/**
 * Consulta en lenguaje natural a JEV sobre el equipo.
 */
export async function consultarJevEmpleados(businessId: string, pregunta: string): Promise<string> {

  // Validación de límites y consumo atómico para chat (Fase 3 & Bugfix)
  const limitsInfo = await getJevCopilotLimitsInfo(businessId);
  if (!limitsInfo.isModuleActive) {
    return "El módulo JEV Copiloto no está activo para el plan actual de este negocio.";
  }
  if (!limitsInfo.canConsume) {
    return `Has alcanzado el límite diario de consultas (${limitsInfo.usageToday}/${limitsInfo.totalReal}) de JEV Copiloto para hoy. El cupo se reinicia automáticamente mañana o puedes solicitar una ampliación al administrador.`;
  }
  await consumeJevCopilotCredit(businessId);


  const contexto = await getEmpleadosContext(businessId);
  const q = (pregunta || '').toLowerCase();

  if (q.includes('mas') || q.includes('servicios') || q.includes('carga') || q.includes('mayor')) {
    const ordenados = [...contexto.colaboradores].sort((a, b) => b.serviciosAsignadosCount - a.serviciosAsignadosCount);
    if (ordenados.length === 0) return 'No hay miembros del equipo registrados.';
    const top = ordenados[0];
    return `El colaborador con más servicios asignados es "${top.nombre}" (${top.especialidad}) con ${top.serviciosAsignadosCount} servicios disponibles.`;
  }

  if (q.includes('inactivo') || q.includes('disponible') || q.includes('ausente')) {
    if (contexto.inactivosCount === 0) {
      return 'Todos los colaboradores registrados en el equipo se encuentran actualmente activos.';
    }
    const inactivosNombres = contexto.colaboradores.filter((c) => !c.isActive).map((c) => c.nombre).join(', ');
    return `Colaboradores inactivos (${contexto.inactivosCount}): ${inactivosNombres}.`;
  }

  if (q.includes('sin servicios') || q.includes('cero') || q.includes('asignar')) {
    if (contexto.sinServiciosCount === 0) {
      return 'Todos los miembros del equipo cuentan con al menos un servicio asignado.';
    }
    const sinServNombres = contexto.colaboradores.filter((c) => c.serviciosAsignadosCount === 0).map((c) => c.nombre).join(', ');
    return `Miembros sin servicios asignados (${contexto.sinServiciosCount}): ${sinServNombres}. No pueden recibir reservas hasta que se les asigne un servicio.`;
  }

  return `Estado del equipo: ${contexto.activosCount} activos de ${contexto.totalColaboradores} registrados, con un total de ${contexto.totalServiciosDisponibles} servicios en catálogo.`;
}

/**
 * Registra en jev_memory que el usuario ejecutó/aceptó una sugerencia de equipo.
 */
export async function registrarAccionEmpleados({
  businessId,
  colaboradorId,
  nombre,
  accion,
  justificacion,
}: {
  businessId: string;
  colaboradorId: string;
  nombre: string;
  accion: string;
  justificacion: string;
}): Promise<string> {
  return registrarAccionJev({
    tipo: 'empleados',
    accion: `Acción sobre equipo: ${accion} (${nombre})`,
    datos: {
      referenciaId: colaboradorId,
      colaborador: nombre,
      sugerenciaJev: accion,
      justificacion,
      resultado: 'aplicado_por_usuario',
    },
    origen: 'JevCopilotWidgetEmpleados',
    usuario: businessId,
  });
}

/**
 * Cierra la acción en memoria.
 */
export async function cerrarAccionEmpleados(memoriaId: string, resultado: string) {
  return cerrarAccionJev(memoriaId, resultado);
}
