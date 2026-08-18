'use server';

/**
 * @fileOverview Servicio de generación de mensajes de recuperación mediante IA.
 * Utiliza Genkit para crear contenido empático basado en el historial del cliente.
 */

import { generateSimpleText } from '@/ai/flows/simple-text-flow';
import type { BookingOpportunity } from '@/services/booking-churn';
import type { Business } from '@/models/business';

export type RecoveryTone = 'cercano' | 'formal' | 'beneficios';

/**
 * Genera un mensaje de WhatsApp personalizado utilizando el motor de IA global.
 */
export async function generateRecoveryMessage(
  opportunity: BookingOpportunity,
  business: Business,
  tone: RecoveryTone = 'cercano'
): Promise<string> {
  const { customerName, lastServiceName, lastStaffName, daysSinceLastVisit } = opportunity;
  const businessName = business.name || 'nuestro negocio';
  const bookingUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/reservar/${business.id}`;

  const toneInstructions = {
    cercano: "un tono muy cálido, amigable y humano. Usa emojis de forma moderada.",
    formal: "un tono profesional, ejecutivo y respetuoso. Sin emojis excesivos.",
    beneficios: "un tono enfocado en el bienestar y los beneficios de retomar su servicio habitual."
  };

  const prompt = `
    Actúa como el dueño del negocio "${businessName}". 
    Escribe un mensaje de WhatsApp para "${customerName}", quien no nos visita desde hace ${daysSinceLastVisit} días.
    Su último servicio fue "${lastServiceName}" con el profesional "${lastStaffName}".
    
    REGLAS ESTRICTAS:
    1. Usa ${toneInstructions[tone]}.
    2. Menciona específicamente que lo extrañamos y que nos encantaría verlo de nuevo para su servicio de ${lastServiceName}.
    3. NO inventes descuentos, precios ni regalos que no se mencionen.
    4. El mensaje debe ser breve (máximo 250 caracteres).
    5. Incluye este enlace de reserva al final: ${bookingUrl}
    6. Responde solo con el texto del mensaje, listo para enviar.
  `;

  try {
    const aiResponse = await generateSimpleText(prompt, business.id);
    
    if (!aiResponse || aiResponse.includes('Error')) {
      throw new Error('Fallback required');
    }

    return aiResponse.trim();
  } catch (error) {
    // Fallback manual de alta calidad si la IA falla
    return `¡Hola ${customerName}! 👋 En ${businessName} te extrañamos. Hace ${daysSinceLastVisit} días que no nos visitas para tu ${lastServiceName}. Nos encantaría volver a atenderte. Puedes agendar tu espacio aquí: ${bookingUrl}`;
  }
}
