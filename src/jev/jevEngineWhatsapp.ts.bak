'use server';

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
  const contexto: ContextoWhatsapp = await getContextoWhatsapp(businessId);

  // Aprendizaje obligatorio de jev_memory (Regla 9)
  const exitosPrevios = contexto.historialMemoria.filter(m => m.estado === 'cerrada');
  const patronesAprendidos: string[] = [];

  if (exitosPrevios.length > 0) {
    patronesAprendidos.push(
      `JEV recuerda ${exitosPrevios.length} respuesta(s) previas atendidas con éxito en este negocio.`
    );
  } else {
    patronesAprendidos.push('Sin historial de memoria previo. JEV está aprendiendo con las acciones de hoy.');
  }

  if (contexto.totalSinResponder === 0) {
    return {
      diagnostico: 'Bandeja al día. No hay chats ni mensajes de contacto pendientes de respuesta en este momento.',
      totalPendientes: 0,
      sugerencias: [],
      patronesAprendidos,
      fechaGeneracion: new Date().toISOString(),
    };
  }

  // Generar sugerencias priorizadas y borradores accionables en español (Regla 8)
  const sugerencias: SugerenciaRespuestaWhatsapp[] = contexto.chatsPendientes.map((chat: ChatPendiente, index) => {
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
