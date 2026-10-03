'use server';

import { getJevCopilotLimitsInfo, consumeJevCopilotCredit } from './jevLimitsService';

import { getResenasContext, ContextoResenas, ResenaJev } from './contextAggregatorResenas';
import { registrarAccionJev, cerrarAccionJev } from './jevMemory';

export interface BorradorRespuestaResena {
  id: string;
  resenaId: string;
  cliente: string;
  calificacion: number;
  comentario: string;
  nivelUrgencia: 'critica' | 'alerta' | 'positiva';
  motivoPrioridad: string;
  borradorRespuesta: string;
}

export interface CopilotoResenasOutput {
  diagnostico: string;
  totalResenas: number;
  promedio: number;
  totalSinResponder: number;
  criticasSinResponder: number;
  resenasSinResponder: ResenaJev[];
  borradoresSugeridos: BorradorRespuestaResena[];
  patronesAprendidos: string[];
  fechaGeneracion: string;
}

/**
 * Motor de IA de JEV para Reseñas y Reputación (Regla 3: Solo lee y propone. Nunca publica respuestas).
 */
export async function obtenerCopilotoResenas(businessId: string): Promise<CopilotoResenasOutput> {

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
  

  const contexto: ContextoResenas = await getResenasContext(businessId);

  // Aprendizaje obligatorio de jev_memory (Regla 9)
  const respuestasPrevias = contexto.historialMemoria.filter((m) => m.tipo === 'resenas');
  const patronesAprendidos: string[] = [];

  if (respuestasPrevias.length > 0) {
    patronesAprendidos.push(
      `JEV recuerda ${respuestasPrevias.length} respuesta(s) a opiniones gestionadas con éxito previamente.`
    );
  } else {
    patronesAprendidos.push('Sin historial de respuestas previas en memoria. JEV aprenderá con las acciones de hoy.');
  }

  // Generar borradores de respuesta adaptados al sentimiento
  const borradoresSugeridos: BorradorRespuestaResena[] = contexto.resenasSinResponder.map((resena) => {
    let borradorRespuesta = '';
    let motivoPrioridad = '';

    if (resena.calificacion <= 2) {
      motivoPrioridad = 'Urgencia máxima: opinión negativa sin atender que afecta la reputación pública del negocio.';
      borradorRespuesta = `Hola ${resena.clienteNombre}, lamentamos sinceramente que tu experiencia no haya sido satisfactoria. Para nosotros tu opinión es fundamental y queremos corregirlo de inmediato. Por favor contáctanos por mensaje directo para brindarte una solución prioritaria.`;
    } else if (resena.calificacion === 3) {
      motivoPrioridad = 'Opinión neutra: oportunidad clave de convertir un cliente insatisfecho en cliente fiel.';
      borradorRespuesta = `Hola ${resena.clienteNombre}, gracias por compartir tu experiencia con nosotros. Tomamos muy en cuenta tus observaciones para seguir mejorando. Esperamos sorprenderte positivamente en tu próxima visita.`;
    } else {
      motivoPrioridad = 'Opinión excelente: momento ideal para fidelizar y agradecer la lealtad del cliente.';
      borradorRespuesta = `¡Muchísimas gracias ${resena.clienteNombre} por tus amables palabras y calificación! Nos alegra mucho saber que disfrutaste nuestro servicio. ¡Te esperamos muy pronto de vuelta!`;
    }

    return {
      id: `borr-${resena.id}`,
      resenaId: resena.id,
      cliente: resena.clienteNombre,
      calificacion: resena.calificacion,
      comentario: resena.comentario,
      nivelUrgencia: resena.nivelUrgencia,
      motivoPrioridad,
      borradorRespuesta,
    };
  });

  // Diagnóstico fundamentado en datos (Regla 8)
  let diagnostico = '';
  if (contexto.resenasCriticas.length > 0) {
    diagnostico = `Atención urgente: ${contexto.resenasCriticas.length} opinión(es) negativa(s) (<=2 estrellas) sin responder en el directorio público.`;
  } else if (contexto.resenasSinResponder.length > 0) {
    diagnostico = `Tienes ${contexto.resenasSinResponder.length} opinión(es) pendiente(s) de respuesta. Calificación promedio general: ${contexto.promedioCalificacion} / 5.0.`;
  } else {
    diagnostico = `Excelente reputación. Todas las ${contexto.totalResenas} opiniones recibidas están atendidas y respondidas. Promedio: ${contexto.promedioCalificacion} ⭐.`;
  }

  return {
    diagnostico,
    totalResenas: contexto.totalResenas,
    promedio: contexto.promedioCalificacion,
    totalSinResponder: contexto.resenasSinResponder.length,
    criticasSinResponder: contexto.resenasCriticas.length,
    resenasSinResponder: contexto.resenasSinResponder,
    borradoresSugeridos,
    patronesAprendidos,
    fechaGeneracion: new Date().toISOString(),
  };
}

/**
 * Consulta en lenguaje natural a JEV sobre opiniones y reputación.
 */
export async function consultarJevResenas(businessId: string, pregunta: string): Promise<string> {

  // Validación de límites y consumo atómico para chat (Fase 3 & Bugfix)
  const limitsInfo = await getJevCopilotLimitsInfo(businessId);
  if (!limitsInfo.isModuleActive) {
    return "El módulo JEV Copiloto no está activo para el plan actual de este negocio.";
  }
  if (!limitsInfo.canConsume) {
    return `Has alcanzado el límite diario de consultas (${limitsInfo.usageToday}/${limitsInfo.totalReal}) de JEV Copiloto para hoy. El cupo se reinicia automáticamente mañana o puedes solicitar una ampliación al administrador.`;
  }
  await consumeJevCopilotCredit(businessId);


  const contexto = await getResenasContext(businessId);
  const q = (pregunta || '').toLowerCase();

  if (q.includes('critica') || q.includes('negativa') || q.includes('urgente') || q.includes('queja')) {
    if (contexto.resenasCriticas.length === 0) {
      return 'Buenas noticias: no tienes opiniones negativas (1-2 estrellas) pendientes de respuesta.';
    }
    const r = contexto.resenasCriticas[0];
    return `Opinión más urgente de responder: ${r.clienteNombre} (${r.calificacion} ⭐): "${r.comentario.slice(0, 70)}...". Se recomienda responder con tono conciliador de inmediato.`;
  }

  if (q.includes('promedio') || q.includes('calificacion') || q.includes('puntuacion')) {
    return `La calificación promedio actual del negocio es ${contexto.promedioCalificacion} ⭐ basada en ${contexto.totalResenas} opiniones registradas (${contexto.distribucion[5] || 0} de 5 estrellas).`;
  }

  if (q.includes('elogian') || q.includes('positivo') || q.includes('destacan')) {
    return `El ${(contexto.distribucion[5] || 0) + (contexto.distribucion[4] || 0)} de las opiniones son positivas (4 y 5 estrellas), destacando la atención y calidad del servicio.`;
  }

  return `Estado general de reputación: ${contexto.promedioCalificacion} ⭐ promedio, con ${contexto.resenasSinResponder.length} opiniones pendientes de responder.`;
}

/**
 * Registra en jev_memory que el usuario copió una respuesta sugerida.
 */
export async function registrarRespuestaResenaCopiada({
  businessId,
  resenaId,
  cliente,
  calificacion,
  borrador,
}: {
  businessId: string;
  resenaId: string;
  cliente: string;
  calificacion: number;
  borrador: string;
}): Promise<string> {
  return registrarAccionJev({
    tipo: 'resenas',
    accion: `Borrador de respuesta copiado para opinión de ${cliente} (${calificacion}⭐)`,
    datos: {
      referenciaId: resenaId,
      cliente,
      calificacion,
      sugerenciaJev: borrador,
      resultado: 'copiado_para_publicar',
    },
    origen: 'JevCopilotWidgetResenas',
    usuario: businessId,
  });
}

/**
 * Cierra la acción en memoria.
 */
export async function cerrarAccionResenas(memoriaId: string, resultado: string) {
  return cerrarAccionJev(memoriaId, resultado);
}
