'use server';

/**
 * @fileOverview Flujo de Genkit para el chatbot del menú público.
 * 
 * FASE 5 (Seguridad Multi-inquilino):
 * - Se elimina 'businessId' del esquema de la IA para evitar alucinaciones.
 * - La herramienta de agendamiento captura el ID directamente del contexto del servidor (closure).
 * - Se implementa normalización estricta de formatos para la Agenda.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAdminFirestore } from '@/firebase/server-init';
import { 
  PublicMenuChatbotInputSchema, 
  PublicMenuChatbotOutputSchema, 
  PublicMenuChatbotOutput,
  DEFAULT_CHATBOT_CONFIG,
  PublicMenuChatbotConfig
} from '@/models/public-menu-chatbot';
import { getAIConfig } from './chat-flow';
import { calculateEndTime } from '@/lib/booking-engine';

/**
 * Normaliza una fecha recibida al estándar YYYY-MM-DD.
 */
function normalizeDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const clean = dateStr.replace(/[^\d/-]/g, '');
  const parts = clean.split(/[/-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return dateStr;
}

/**
 * Normaliza la hora al formato 24h HH:mm.
 */
function normalizeTime(timeStr: string): string {
  const clean = timeStr.toLowerCase().trim();
  const match = clean.match(/(\d{1,2}):(\d{2})\s*(pm|am|p\.m\.|a\.m\.)?/);
  if (!match) return timeStr;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = match[3];
  if (ampm && ampm.includes('p') && hours < 12) hours += 12;
  if (ampm && ampm.includes('a') && hours === 12) hours = 0;
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

export const publicMenuChatbotFlow = ai.defineFlow(
  {
    name: 'publicMenuChatbotFlow',
    inputSchema: PublicMenuChatbotInputSchema,
    outputSchema: PublicMenuChatbotOutputSchema,
  },
  async (input): Promise<PublicMenuChatbotOutput> => {
    const db = await getAdminFirestore();
    const { businessId, question, history = [] } = input;
    const lowQuestion = question.toLowerCase().trim();

    // --- PASO 1: GUARDIA DE PRIORIDAD PARA AGENDAMIENTO ---
    const appointmentIntents = ['cita', 'agendar', 'reserva', 'turno', 'reservar'];
    const isAppointmentIntent = appointmentIntents.some(intent => lowQuestion.includes(intent));

    if (!isAppointmentIntent) {
        // Respuestas personalizadas e información del negocio (solo si no es cita)
        try {
          const responsesSnap = await db.collection(`businesses/${businessId}/publicMenuChatbot/main/responses`)
            .where('isActive', '==', true).get();
          const matchedCustom = responsesSnap.docs.find(doc => lowQuestion.includes(doc.data().question?.toLowerCase().trim() || ''));
          if (matchedCustom) return { answer: matchedCustom.data().answer, source: 'custom_response' };
        } catch (e) {}

        const businessSnap = await db.collection('businesses').doc(businessId).get();
        if (businessSnap.exists) {
            const bData = businessSnap.data();
            const infoTriggers = ['donde queda', 'ubicación', 'direccion', 'teléfono', 'contacto', 'whatsapp'];
            if (infoTriggers.some(t => lowQuestion.includes(t))) {
              return { 
                answer: `Estamos ubicados en ${bData?.address || 'nuestra sede'}. Tel: ${bData?.phone || 'N/A'}.`, 
                source: 'business_info' 
              };
            }
        }
    }

    // --- PASO 2: DEFINICIÓN DE HERRAMIENTA CONTEXTUAL (SaaS Multi-tenant Safe) ---
    // Definimos la herramienta con un ID único para evitar el error "Action already registered"
    const toolName = `bookAppointment_${businessId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    const bookAppointmentTool = ai.defineTool(
      {
        name: toolName,
        description: 'Registra una reserva. NO requiere businessId, se inyecta automáticamente.',
        inputSchema: z.object({
          customerName: z.string().describe('Nombre del cliente'),
          customerPhone: z.string().describe('WhatsApp del cliente'),
          serviceName: z.string().describe('Servicio solicitado'),
          date: z.string().describe('Fecha YYYY-MM-DD'),
          startTime: z.string().describe('Hora HH:mm'),
        }),
      },
      async (toolInput) => {
        try {
          const normalizedDate = normalizeDate(toolInput.date);
          const normalizedStartTime = normalizeTime(toolInput.startTime);
          
          // Búsqueda de servicio para obtener metadatos (duración/precio)
          const servicesSnap = await db.collection(`businesses/${businessId}/bookingServices`).get();
          const service = servicesSnap.docs.map(d => ({id: d.id, ...d.data()} as any))
            .find(s => s.name.toLowerCase().includes(toolInput.serviceName.toLowerCase()));

          const reservationId = db.collection('placeholder').doc().id;
          const reservationData = {
            id: reservationId,
            businessId: businessId, // <--- INYECCIÓN SEGURA DESDE EL CLOSURE
            customerName: toolInput.customerName.trim(),
            customerPhone: toolInput.customerPhone.trim(),
            serviceId: service?.id || 'chatbot_generic',
            serviceName: service?.name || toolInput.serviceName,
            date: normalizedDate,
            startTime: normalizedStartTime,
            endTime: calculateEndTime(normalizedStartTime, service?.durationMinutes || 45),
            price: service?.price || 0,
            status: 'pending',
            source: 'chatbot',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await db.collection(`businesses/${businessId}/reservations`).doc(reservationId).set(reservationData);
          
          console.log(`[Chatbot Success] Cita guardada en ID REAL: businesses/${businessId}/reservations/${reservationId}`);

          return { 
            success: true, 
            reservationId: reservationId.slice(-6).toUpperCase(),
            date: normalizedDate,
            startTime: normalizedStartTime
          };
        } catch (error: any) {
          console.error("[bookAppointmentTool] Error:", error.message);
          return { success: false };
        }
      }
    );

    // --- PASO 3: EJECUCIÓN DEL MOTOR DE IA ---
    try {
      const catalogSnap = await db.collection(`businesses/${businessId}/publicData`).doc('catalog').get();
      const products = catalogSnap.data()?.products || [];
      const formattedCatalog = products.map((p: any) => `- ${p.name}: $${p.price}`).join('\n');

      const aiConfig = await getAIConfig(businessId);
      
      const systemPrompt = `Eres el asistente virtual de ${businessId}.
      CATÁLOGO ACTUAL:
      ${formattedCatalog}
      
      REGLAS:
      1. Si el cliente quiere agendar, solicita: Nombre, WhatsApp, Servicio y Fecha/Hora.
      2. Cuando tengas los datos, usa la herramienta '${toolName}'.
      3. IMPORTANTE: El ID de negocio se inyecta automáticamente, no lo preguntes ni lo inventes.
      4. SOLO confirma la cita cuando la herramienta devuelva éxito.`;

      const response = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        tools: [bookAppointmentTool],
        messages: [
          { role: 'system', content: [{ text: systemPrompt }] },
          ...history.map(h => ({ role: h.role as any, content: [{ text: h.content }] })),
          { role: 'user', content: [{ text: question }] }
        ],
        config: { temperature: 0.1, apiKey: aiConfig.apiKey }
      });
      
      return { 
        answer: response.text || "Solicitud procesada.", 
        source: 'ai_generated' 
      };

    } catch (error: any) {
      console.error("[REAL_CHATBOT_ERROR]:", error);
      return { answer: "Hubo un inconveniente técnico. Por favor, intenta de nuevo.", source: 'fallback' };
    }
  }
);
