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
    
    REGLAS ESTRICTAS DE REDACCIÓN (BLOQUEO DE LONGITUD):
    1. Usa ${toneInstructions[tone]}.
    2. El mensaje DEBE ser ultra-breve y directo.
    3. CUERPO DEL TEXTO: MÁXIMO 20 PALABRAS (alrededor de 120 caracteres).
    4. NO inventes descuentos, precios ni servicios que no existan.
    5. Finaliza obligatoriamente con el enlace de reserva en una nueva línea: ${bookingUrl}
    6. El mensaje TOTAL (saludo + texto + enlace) NUNCA debe superar los 220 caracteres.
    
    Responde solo con el texto del mensaje listo para enviar.
  `;

  try {
    const aiResponse = await generateSimpleText(prompt, business.id);
    
    if (!aiResponse || aiResponse.includes('Error')) {
      throw new Error('Fallback required');
    }

    // Limpieza de seguridad para asegurar que no se pase del límite absoluto de la UI (250)
    return aiResponse.trim().substring(0, 245);
  } catch (error) {
    // Fallback manual ultra-conciso según el tono
    if (tone === 'formal') {
      return `Estimado/a ${customerName}, le saludamos de ${businessName}. Le extrañamos por aquí. Puede agendar su próximo ${lastServiceName} en este enlace: ${bookingUrl}`;
    }
    if (tone === 'beneficios') {
      return `¡Hola ${customerName}! Dale el mejor cuidado a tu imagen con ${lastServiceName} en ${businessName}. Te esperamos pronto. Agenda aquí: ${bookingUrl}`;
    }
    // Default / Cercano
    return `¡Hola ${customerName}! 😊 Te extrañamos en ${businessName}. ¿Te gustaría agendar tu ${lastServiceName}? Nos encantaría verte. Reserva aquí: ${bookingUrl}`;
  }
}
