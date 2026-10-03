'use server';

import { getJevCopilotLimitsInfo, consumeJevCopilotCredit } from './jevLimitsService';
import { getContextoWhatsapp, ContextoWhatsapp, ChatPendiente } from './contextAggregatorWhatsapp';
import { registrarAccionJev, cerrarAccionJev } from './jevMemory';

export interface SugerenciaRespuestaWhatsapp {
  id: string;
  chatId: string;
  cliente: string;
  telefono: string;
  urgencia: 'alta' | 'media' | 'baja';
  motivo: string;
  borradorRespuesta: string;
  minutosEspera: number;
}

export interface CopilotoWhatsappOutput {
  diagnostico: string;
  totalPendientes: number;
  sugerencias: SugerenciaRespuestaWhatsapp[];
  patronesAprendidos: string[];
  fechaGeneracion: string;
}

/**
 * Motor de IA de JEV para WhatsApp (Regla 3: Solo lee y propone. Nunca envía).
 */
export async function obtenerCopilotoWhatsapp(businessId: string): Promise<CopilotoWhatsappOutput> {
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

  const contexto = await getContextoWhatsapp(businessId);
  const patronesAprendidos: string[] = [
    contexto.historialMemoria && contexto.historialMemoria.length > 0
      ? `JEV recuerda ${contexto.historialMemoria.length} acción(es) previa(s) en este módulo.`
      : 'Sin historial de respuestas previas en memoria.'
  ];

  // Generar sugerencias priorizadas y borradores accionables en español (Regla 8)
  const sugerencias: SugerenciaRespuestaWhatsapp[] = contexto.chatsPendientes.map((chat: ChatPendiente, index: number) => {
    let urgencia: 'alta' | 'media' | 'baja' = 'baja';
    if (chat.minutosEspera > 120 || index === 0) urgencia = 'alta';
    else if (chat.minutosEspera > 45) urgencia = 'media';

    // Redacción breve, empática y orientada a cerrar ventas/atención
    const borradorRespuesta = `¡Hola ${chat.clienteNombre}! Gracias por contactarnos. Con gusto te atiendo para ayudarte con tu consulta. ¿En qué podemos apoyarte hoy?`;

    return {
      id: `sug-${chat.id}`,
      chatId: chat.id,
      cliente: chat.clienteNombre,
      telefono: chat.clienteTelefono,
      urgencia,
      motivo: `En espera desde hace ${chat.minutosEspera} min sobre: "${chat.ultimoMensaje.slice(0, 45)}..."`,
      borradorRespuesta,
      minutosEspera: chat.minutosEspera,
    };
  });

  const altaUrgencia = sugerencias.filter(s => s.urgencia === 'alta').length;
  const diagnostico = `${contexto.totalSinResponder} mensaje(s) pendiente(s) de atención. ${altaUrgencia} con prioridad alta por tiempo de espera prolongado.`;

  return {
    diagnostico,
    totalPendientes: contexto.totalSinResponder,
    sugerencias,
    patronesAprendidos,
    fechaGeneracion: new Date().toISOString(),
  };
}

/**
 * Registra en jev_memory que el usuario copió y aprobó una sugerencia.
 */
export async function registrarBorradorCopiadoWhatsapp({
  businessId,
  chatId,
  cliente,
  borrador,
  minutosEspera,
}: {
  businessId: string;
  chatId: string;
  cliente: string;
  borrador: string;
  minutosEspera: number;
}): Promise<string> {
  return registrarAccionJev({
    tipo: 'whatsapp',
    accion: `Borrador copiado para responder a ${cliente}`,
    datos: {
      referenciaId: chatId,
      cliente,
      sugerenciaJev: borrador,
      metricasAntes: { minutosEspera },
    },
    origen: 'JevCopilotWidgetWhatsapp',
    usuario: businessId,
  });
}

/**
 * Cierra la acción en memoria cuando el usuario reporta el resultado.
 */
export async function cerrarAccionWhatsapp(memoriaId: string, resultado: string) {
  return cerrarAccionJev(memoriaId, resultado);
}
