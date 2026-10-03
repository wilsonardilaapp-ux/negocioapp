'use server';

import { getJevCopilotLimitsInfo, consumeJevCopilotCredit } from './jevLimitsService';

import { getRetencionContext, ContextoRetencion, ClienteRetencionJev } from './contextAggregatorRetencion';
import { registrarAccionJev, cerrarAccionJev } from './jevMemory';

export interface BorradorReconquista {
  id: string;
  clienteId: string;
  clienteNombre: string;
  telefono: string;
  esVIP: boolean;
  nivelRiesgo: 'critico' | 'alerta' | 'vigilancia';
  motivo: string;
  borradorMensaje: string;
  gastoHistorico: number;
  diasSinComprar: number;
}

export interface CopilotoRetencionOutput {
  diagnostico: string;
  totalClientes: number;
  totalEnRiesgo: number;
  vipsEnRiesgo: number;
  gastoEnRiesgoTotal: number;
  clientesEnRiesgo: ClienteRetencionJev[];
  borradoresReconquista: BorradorReconquista[];
  patronesAprendidos: string[];
  fechaGeneracion: string;
}

/**
 * Motor de IA de JEV para Retención (Regla 3: Solo lee y propone. Nunca envía mensajes).
 */
export async function obtenerCopilotoRetencion(businessId: string): Promise<CopilotoRetencionOutput> {

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
  

  const contexto: ContextoRetencion = await getRetencionContext(businessId);

  // Aprendizaje obligatorio de jev_memory (Regla 9)
  const reconquistasPrevias = contexto.historialMemoria.filter((m) => m.tipo === 'retencion');
  const patronesAprendidos: string[] = [];

  if (reconquistasPrevias.length > 0) {
    patronesAprendidos.push(
      `JEV recuerda ${reconquistasPrevias.length} mensaje(s) de reconquista generados previamente.`
    );
  } else {
    patronesAprendidos.push('Sin historial de reconquistas previas. JEV registrará los resultados de hoy.');
  }

  // Generar borradores de reconquista personalizados
  const borradoresReconquista: BorradorReconquista[] = contexto.clientesEnRiesgo.map((cliente) => {
    let borradorMensaje = '';

    if (cliente.esVIP) {
      borradorMensaje = `¡Hola ${cliente.nombre}! Te extrañamos mucho en nuestro negocio. Como uno de nuestros clientes más especiales, queremos saber cómo estás y compartirte una cortesía exclusiva en tu próxima visita. ¿Te gustaría conocer las novedades de esta semana?`;
    } else {
      borradorMensaje = `¡Hola ${cliente.nombre}! Esperamos que estés muy bien. Hace unos días que no te vemos y preparamos un detalle especial para ti. ¿En qué podemos apoyarte hoy?`;
    }

    return {
      id: `rec-${cliente.id}`,
      clienteId: cliente.id,
      clienteNombre: cliente.nombre,
      telefono: cliente.telefono,
      esVIP: cliente.esVIP,
      nivelRiesgo: cliente.nivelRiesgo as 'critico' | 'alerta' | 'vigilancia',
      motivo: cliente.motivoRiesgo,
      borradorMensaje,
      gastoHistorico: cliente.gastoHistorico,
      diasSinComprar: cliente.diasSinComprar,
    };
  });

  const vipsEnRiesgo = contexto.clientesEnRiesgo.filter((c) => c.esVIP).length;

  let diagnostico = '';
  if (contexto.clientesEnRiesgo.length > 0) {
    diagnostico = `Atención requerida: ${contexto.clientesEnRiesgo.length} cliente(s) en riesgo de abandono (${vipsEnRiesgo} VIPs). Gasto histórico en riesgo: $${contexto.gastoEnRiesgoTotal.toLocaleString('es-CO')}.`;
  } else {
    diagnostico = `Retención saludable. Los ${contexto.totalClientes} clientes registrados mantienen un ciclo de compra activo dentro de sus frecuencias habituales.`;
  }

  return {
    diagnostico,
    totalClientes: contexto.totalClientes,
    totalEnRiesgo: contexto.clientesEnRiesgo.length,
    vipsEnRiesgo,
    gastoEnRiesgoTotal: contexto.gastoEnRiesgoTotal,
    clientesEnRiesgo: contexto.clientesEnRiesgo,
    borradoresReconquista,
    patronesAprendidos,
    fechaGeneracion: new Date().toISOString(),
  };
}

/**
 * Consulta en lenguaje natural a JEV sobre retención.
 */
export async function consultarJevRetencion(businessId: string, pregunta: string): Promise<string> {

  // Validación de límites y consumo atómico para chat (Fase 3 & Bugfix)
  const limitsInfo = await getJevCopilotLimitsInfo(businessId);
  if (!limitsInfo.isModuleActive) {
    return "El módulo JEV Copiloto no está activo para el plan actual de este negocio.";
  }
  if (!limitsInfo.canConsume) {
    return `Has alcanzado el límite diario de consultas (${limitsInfo.usageToday}/${limitsInfo.totalReal}) de JEV Copiloto para hoy. El cupo se reinicia automáticamente mañana o puedes solicitar una ampliación al administrador.`;
  }
  await consumeJevCopilotCredit(businessId);


  const contexto = await getRetencionContext(businessId);
  const q = (pregunta || '').toLowerCase();

  if (q.includes('vip') || q.includes('mayor') || q.includes('prioridad')) {
    const vipCritico = contexto.clientesEnRiesgo.find((c) => c.esVIP);
    if (!vipCritico) {
      return 'Actualmente ningún cliente VIP se encuentra en nivel crítico de abandono.';
    }
    return `El cliente VIP con mayor riesgo es "${vipCritico.nombre}". Gasto histórico acumulado: $${vipCritico.gastoHistorico.toLocaleString('es-CO')}, lleva ${vipCritico.diasSinComprar} días sin comprar (habitual: cada ${vipCritico.cicloHabitualDias} días).`;
  }

  if (q.includes('dinero') || q.includes('gasto') || q.includes('cuanto') || q.includes('representan')) {
    return `Los ${contexto.clientesEnRiesgo.length} clientes en riesgo acumulan un valor histórico de $${contexto.gastoEnRiesgoTotal.toLocaleString('es-CO')} en pedidos.`;
  }

  if (q.includes('estrategia') || q.includes('funciono') || q.includes('mejor')) {
    return 'Estrategia recomendada: para clientes VIP, saludo cálido de seguimiento sin presión de venta directa; para clientes regulares, recordatorio de novedades o cortesía de envío.';
  }

  return `Resumen de retención: ${contexto.clientesEnRiesgo.length} clientes en riesgo de abandono (${contexto.clientesVIP.length} VIPs en total).`;
}

/**
 * Registra en jev_memory que el usuario copió un mensaje de reconquista.
 */
export async function registrarReconquistaCopiada({
  businessId,
  clienteId,
  clienteNombre,
  borrador,
  metricasAntes,
}: {
  businessId: string;
  clienteId: string;
  clienteNombre: string;
  borrador: string;
  metricasAntes: { diasSinComprar: number; gastoHistorico: number; esVIP: boolean };
}): Promise<string> {
  return registrarAccionJev({
    tipo: 'retencion',
    accion: `Borrador de reconquista copiado para ${clienteNombre}`,
    datos: {
      referenciaId: clienteId,
      cliente: clienteNombre,
      sugerenciaJev: borrador,
      metricasAntes,
      resultado: 'pendiente',
    },
    origen: 'JevCopilotWidgetRetencion',
    usuario: businessId,
  });
}

/**
 * Cierra la acción en memoria.
 */
export async function cerrarAccionRetencion(memoriaId: string, resultado: string) {
  return cerrarAccionJev(memoriaId, resultado);
}
