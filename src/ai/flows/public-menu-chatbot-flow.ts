'use server';

/**
 * @fileOverview Flujo de Genkit para el chatbot del menú público.
 * 
 * RE-ARQUITECTURA DEFINITIVA (Tenant Isolation):
 * - Implementa un factory de herramientas para inyectar 'businessId' vía Closure.
 * - Elimina 'businessId' del esquema que ve la IA, garantizando que el guardado ocurra en el inquilino correcto.
 * - Utiliza un cache en memoria para evitar el error "Action already registered" de Genkit.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAdminFirestore } from '@/firebase/server-init';
import { 
  PublicMenuChatbotInputSchema, 
  PublicMenuChatbotOutputSchema, 
  PublicMenuChatbotOutput,
} from '@/models/public-menu-chatbot';
import { getAIConfig } from './chat-flow';
import { calculateEndTime } from '@/lib/booking-engine';

// Cache para evitar registrar la misma herramienta múltiples veces en el registro global de Genkit
const toolCache = new Map<string, any>();

/**
 * Genera o recupera una herramienta de agendamiento vinculada a un negocio específico.
 * Captura el businessId del contexto del servidor (Closure), impidiendo que el LLM lo alumine o use fallbacks.
 */
function getOrCreateBookAppointmentTool(businessId: string) {
  // Normalizamos el nombre para cumplir con el estándar de Genkit ([a-z0-9-]+)
  const safeId = businessId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const toolName = `bookAppointment-${safeId}`;

  if (toolCache.has(businessId)) {
    return toolCache.get(businessId);
  }

  const tool = ai.defineTool(
    {
      name: toolName,
      description: 'Registra una reserva en el sistema de citas de Firestore.',
      inputSchema: z.object({
        customerName: z.string().describe('Nombre del cliente'),
        customerPhone: z.string().describe('WhatsApp del cliente'),
        serviceName: z.string().describe('Nombre del servicio solicitado'),
        date: z.string().describe('Fecha de la cita en formato YYYY-MM-DD'),
        startTime: z.string().describe('Hora de inicio en formato HH:mm (24h)'),
      }),
    },
    async (toolInput) => {
      // LOG DE AUDITORÍA: Confirmamos que usamos el ID del cierre, no uno enviado por la IA
      console.log(`[bookAppointmentTool] Ejecutando guardado para: ${toolInput.customerName} en el inquilino REAL: ${businessId}`);
      
      try {
        const db = await getAdminFirestore();
        
        // Búsqueda resiliente de metadatos del servicio para asegurar precio y duración correctos
        const servicesSnap = await db.collection(`businesses/${businessId}/bookingServices`).get();
        const service = servicesSnap.docs.map(d => ({id: d.id, ...d.data()} as any))
          .find(s => s.name.toLowerCase().includes(toolInput.serviceName.toLowerCase()));

        const reservationId = db.collection('placeholder').doc().id;
        const duration = service?.durationMinutes || 45;
        const price = service?.price || 0;

        const reservationData = {
          id: reservationId,
          businessId: businessId, // ID GARANTIZADO POR EL SERVIDOR
          customerName: toolInput.customerName.trim(),
          customerPhone: toolInput.customerPhone.trim(),
          serviceId: service?.id || 'chatbot_generic',
          serviceName: service?.name || toolInput.serviceName,
          staffId: null,
          staffName: "Pendiente de asignación",
          date: toolInput.date,
          startTime: toolInput.startTime,
          endTime: calculateEndTime(toolInput.startTime, duration),
          price: price,
          durationMinutes: duration,
          status: 'pending',
          source: 'chatbot',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Sanitización atómica del payload para evitar errores de campos undefined en Firestore Admin SDK
        const cleanData = JSON.parse(JSON.stringify(reservationData));

        await db.collection(`businesses/${businessId}/reservations`).doc(reservationId).set(cleanData);
        
        console.log(`[bookAppointmentTool] ÉXITO: Cita persistida en path: businesses/${businessId}/reservations/${reservationId}`);

        return { 
          success: true, 
          reservationId: reservationId.slice(-6).toUpperCase(),
          date: toolInput.date,
          startTime: toolInput.startTime,
          customerName: toolInput.customerName,
          serviceName: service?.name || toolInput.serviceName
        };
      } catch (error: any) {
        console.error("[bookAppointmentTool] Error crítico de persistencia:", error.message);
        return { 
          success: false, 
          error: "Error interno al conectar con la base de datos de reservas." 
        };
      }
    }
  );

  toolCache.set(businessId, tool);
  return tool;
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

    // Recuperamos la herramienta blindada para este inquilino específico
    const appointmentTool = getOrCreateBookAppointmentTool(businessId);

    // --- PASO 1: GUARDIA DE PRIORIDAD PARA AGENDAMIENTO ---
    const appointmentIntents = ['cita', 'agendar', 'reserva', 'turno', 'reservar'];
    const isAppointmentIntent = appointmentIntents.some(intent => lowQuestion.includes(intent));

    if (!isAppointmentIntent) {
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

    // --- PASO 2: EJECUCIÓN DEL MOTOR DE IA ---
    try {
      const catalogSnap = await db.collection(`businesses/${businessId}/publicData`).doc('catalog').get();
      const products = catalogSnap.data()?.products || [];
      const formattedCatalog = products.map((p: any) => `- ${p.name}: $${p.price}`).join('\n');

      const aiConfig = await getAIConfig(businessId);
      
      const systemPrompt = `Eres el asistente virtual oficial del negocio.
      CATÁLOGO DE SERVICIOS/PRODUCTOS:
      ${formattedCatalog}
      
      REGLAS CRÍTICAS:
      1. Si el cliente quiere agendar, solicita: Nombre, WhatsApp, Servicio y Fecha/Hora.
      2. Cuando tengas los datos, usa la herramienta '${appointmentTool.name}'.
      3. SOLO confirma la cita cuando la herramienta devuelva éxito.
      4. NO menciones identificadores técnicos ni IDs de negocio al cliente.
      5. Formato de respuesta tras éxito: Muestra el ID de reserva, servicio, fecha y hora de forma estructurada.`;

      const response = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        tools: [appointmentTool],
        messages: [
          { role: 'system', content: [{ text: systemPrompt }] },
          ...history.map(h => ({ role: h.role as any, content: [{ text: h.content }] })),
          { role: 'user', content: [{ text: question }] }
        ],
        config: { temperature: 0.1, apiKey: aiConfig.apiKey }
      });
      
      return { 
        answer: response.text || "Tu solicitud ha sido procesada.", 
        source: 'ai_generated' 
      };

    } catch (error: any) {
      console.error("[REAL_CHATBOT_ERROR]:", error);
      return { 
        answer: "Lo siento, tuve un inconveniente al procesar tu consulta. Por favor intenta de nuevo o contacta al negocio.", 
        source: 'fallback' 
      };
    }
  }
);