'use server';

/**
 * @fileOverview Servicio de generación de mensajes de recuperación mediante IA.
 * Utiliza Genkit para crear contenido empático basado en el historial del cliente.
 * Optimizado con control estricto de longitud para garantizar compatibilidad con WhatsApp.
 */

import { generateSimpleText } from '@/ai/flows/simple-text-flow';
import type { BookingOpportunity } from '@/services/booking-churn';
import type { Business } from '@/models/business';

export type RecoveryTone = 'cercano' | 'formal' | 'beneficios';

/**
 * Genera un mensaje de WhatsApp personalizado utilizando el motor de IA global.
 * Implementa reglas estrictas de brevedad para no superar los 250 caracteres totales.
 */
export async function generateRecoveryMessage(
  opportunity: BookingOpportunity,
  business: Business,
  tone: RecoveryTone = 'cercano'
): Promise<string> {
  const { customerName, lastServiceName, daysSinceLastVisit } = opportunity;
  const businessName = business.name || 'nuestro negocio';
  
  // Determinamos el origen para el enlace
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://markix.com';
  const bookingUrl = `${origin}/reservar/${business.id}`;

  const toneInstructions = {
    cercano: "un tono muy cálido, amigable y humano (estilo WhatsApp personal). Usa pocos emojis.",
    formal: "un tono profesional, ejecutivo y respetuoso. Sin emojis.",
    beneficios: "un tono enfocado en el bienestar y valor de retomar su servicio habitual."
  };

  const prompt = `
    Actúa como el dueño del negocio "${businessName}". 
    Escribe un mensaje de WhatsApp para "${customerName}", quien no nos visita hace ${daysSinceLastVisit} días.
    Su último servicio fue "${lastServiceName}".
    
    REGLAS DE ORO DE LONGITUD (INCUMPLE Y SERÁS RECHAZADO):
    1. Estilo: ${toneInstructions[tone]}.
    2. Brevedad: El mensaje debe ser EXTREMADAMENTE corto.
    3. El CUERPO del texto (sin el link) debe tener MÁXIMO 140 caracteres.
    4. NO inventes descuentos ni servicios ficticios.
    5. Finaliza obligatoriamente con el enlace de reserva en una nueva línea: ${bookingUrl}
    6. El mensaje TOTAL (texto + link) NO puede superar los 230 caracteres bajo ninguna circunstancia.
    
    Responde únicamente con el texto del mensaje listo para enviar.
  `;

  try {
    const aiResponse = await generateSimpleText(prompt, business.id);
    
    if (!aiResponse || aiResponse.includes('Error')) {
      throw new Error('Fallback required');
    }

    // Limpieza de seguridad: Recorte estricto a 245 para dejar margen a la UI
    return aiResponse.trim().substring(0, 245);
  } catch (error) {
    // Fallback manual ultra-conciso resiliente a nombres largos
    let baseMsg = "";
    if (tone === 'formal') {
      baseMsg = `Estimado/a ${customerName}, le saludamos de ${businessName}. Le extrañamos por aquí. Puede agendar su próximo ${lastServiceName} en:`;
    } else if (tone === 'beneficios') {
      baseMsg = `¡Hola ${customerName}! Dale el mejor cuidado a tu imagen con ${lastServiceName} en ${businessName}. Agenda aquí:`;
    } else {
      baseMsg = `¡Hola ${customerName}! 😊 Te extrañamos en ${businessName}. ¿Agendamos tu ${lastServiceName}? Reserva aquí:`;
    }

    const finalFallback = `${baseMsg}\n${bookingUrl}`;
    return finalFallback.substring(0, 245);
  }
}
