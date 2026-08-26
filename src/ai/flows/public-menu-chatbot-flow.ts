
'use server';

/**
 * @fileOverview Flujo de Genkit para el chatbot del menú público con resolución defensiva de identidad (Tenant Resolution).
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

// Registro global de herramientas para evitar colisiones en Genkit v1.x
const toolsCache = new Map<string, any>();

/**
 * Resuelve o registra la herramienta de agendamiento para un negocio específico.
 */
function getOrCreateBookAppointmentTool(businessId: string) {
  const safeId = businessId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const toolName = `bookAppointment_${safeId}`;

  if (toolsCache.has(businessId)) {
    return toolsCache.get(businessId);
  }

  const tool = ai.defineTool(
    {
      name: toolName,
      description: 'Registra una cita o reserva en la agenda del negocio.',
      inputSchema: z.object({
        customerName: z.string().describe('Nombre completo del cliente'),
        customerPhone: z.string().describe('WhatsApp de contacto'),
        serviceName: z.string().describe('Nombre del servicio solicitado'),
        date: z.string().describe('Fecha en formato YYYY-MM-DD'),
        startTime: z.string().describe('Hora en formato 24h (HH:mm)'),
      }),
    },
    async (toolInput) => {
      try {
        console.log(">>> [DEBUG 4 - TOOL EXECUTION START]", toolInput);

        const db = await getAdminFirestore();
        
        const servicesSnap = await db.collection(`businesses/${businessId}/bookingServices`).get();
        const matchedService = servicesSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .find(s => s.name.toLowerCase().includes(toolInput.serviceName.toLowerCase()));

        const reservationId = db.collection('placeholder').doc().id;
        const duration = matchedService?.durationMinutes || 45;
        const price = matchedService?.price || 0;

        const reservationData = {
          id: reservationId,
          businessId: businessId,
          customerName: toolInput.customerName.trim(),
          customerPhone: toolInput.customerPhone.trim(),
          serviceId: matchedService?.id || 'chatbot_generic',
          serviceName: matchedService?.name || toolInput.serviceName,
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

        const cleanData = JSON.parse(JSON.stringify(reservationData));

        await db.collection(`businesses/${businessId}/reservations`).doc(reservationId).set(cleanData);
        
        console.log(">>> [DEBUG 5 - FIRESTORE WRITE SUCCESS]", { path: `businesses/${businessId}/reservations/${reservationId}` });

        return { 
          success: true, 
          reservationId: reservationId.slice(-6).toUpperCase(),
          customerName: toolInput.customerName,
          serviceName: matchedService?.name || toolInput.serviceName,
          date: toolInput.date,
          startTime: toolInput.startTime
        };
      } catch (error: any) {
        console.error(">>> [DEBUG 6 - TOOL ERROR CATCH]:", error.message, error.stack);
        return { success: false, error: "Servicio de agenda temporalmente fuera de línea." };
      }
    }
  );

  toolsCache.set(businessId, tool);
  return tool;
}

export const publicMenuChatbotFlow = ai.defineFlow(
  {
    name: 'publicMenuChatbotFlow',
    inputSchema: PublicMenuChatbotInputSchema,
    outputSchema: PublicMenuChatbotOutputSchema,
  },
  async (input): Promise<PublicMenuChatbotOutput> => {
    let { businessId, question, history = [] } = input;
    const lowQuestion = question.toLowerCase().trim();
    
    console.log(">>> [DEBUG 1 - FLOW ENTRY]", { businessId, question });

    const db = await getAdminFirestore();

    // --- CAPA 0: RESOLUCIÓN DEFENSIVA DE TENANT (SLUG -> UID) ---
    // Si el documento directo no existe, buscamos por el campo slug
    const directSnap = await db.collection('businesses').doc(businessId).get();
    if (!directSnap.exists) {
        console.log(`>>> [TENANT RESOLUTION] Buscando ID canónico para slug: ${businessId}`);
        const slugQuery = await db.collection('businesses')
            .where('slug', '==', businessId)
            .limit(1)
            .get();
        
        if (!slugQuery.empty) {
            businessId = slugQuery.docs[0].id;
            console.log(`>>> [TENANT RESOLUTION] ID resuelto: ${businessId}`);
        } else {
            // Intento secundario: buscar en shareConfig si se pasó el slug dinámico
            const shareQuery = await db.collectionGroup('shareConfig')
                .where('slug', '==', businessId)
                .limit(1)
                .get();
            
            if (!shareQuery.empty) {
                const parentId = shareQuery.docs[0].ref.parent.parent?.id;
                if (parentId) {
                    businessId = parentId;
                    console.log(`>>> [TENANT RESOLUTION] ID resuelto vía shareConfig: ${businessId}`);
                }
            }
        }
    }
    
    // CAPA 1: RESPUESTAS PREDETERMINADAS
    try {
      const responsesSnap = await db.collection(`businesses/${businessId}/publicMenuChatbot/main/responses`)
        .where('isActive', '==', true).get();
      const matchedCustom = responsesSnap.docs.find(doc => lowQuestion.includes(doc.data().question?.toLowerCase().trim() || ''));
      if (matchedCustom) return { answer: matchedCustom.data().answer, source: 'custom_response' };
    } catch (e) {}

    // CAPA 2: CATÁLOGO
    const businessSnap = await db.collection('businesses').doc(businessId).get();
    const catalogSnap = await db.collection(`businesses/${businessId}/publicData`).doc('catalog').get();
    const products = catalogSnap.data()?.products || [];
    const formattedCatalog = products.map((p: any) => `- ${p.name}: $${p.price}`).join('\n');

    // CAPA 3 Y 4: RAZONAMIENTO Y AGENDAMIENTO
    try {
      const aiConfig = await getAIConfig(businessId);
      
      // RESOLUCIÓN DEFENSIVA DE API KEY
      let resolvedApiKey = (aiConfig.apiKey || '').trim();
      const isConfigKeyValid = resolvedApiKey.startsWith('AIza');
      
      if (!isConfigKeyValid) {
        resolvedApiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || '').trim();
      }

      const appointmentTool = getOrCreateBookAppointmentTool(businessId);

      const systemPrompt = `Eres el asistente virtual oficial del negocio.
      
      CONTEXTO DEL NEGOCIO:
      Nombre: ${businessSnap.data()?.name || 'Nuestro Negocio'}
      Ubicación: ${businessSnap.data()?.address || 'Ver en catálogo'}
      
      CATÁLOGO DE SERVICIOS/PRODUCTOS:
      ${formattedCatalog}
      
      REGLAS DE AGENDAMIENTO:
      1. Si el cliente desea una cita, solicita: Nombre, WhatsApp, Servicio y Fecha/Hora.
      2. Una vez tengas los datos, utiliza la herramienta '${appointmentTool.name}'.
      3. SOLO confirma la reserva cuando la herramienta devuelva éxito.
      4. Muestra siempre el ID de reserva recibido para que el cliente lo guarde.`;

      const response = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        tools: [appointmentTool],
        messages: [
          { role: 'system', content: [{ text: systemPrompt }] },
          ...history.map(h => ({ role: h.role as any, content: [{ text: h.content }] })),
          { role: 'user', content: [{ text: question }] }
        ],
        config: { 
          temperature: 0.1, 
          apiKey: resolvedApiKey 
        }
      });
      
      return { 
        answer: response.text || "He recibido tu solicitud, ¿en qué más puedo ayudarte?", 
        source: 'ai_generated' 
      };

    } catch (error: any) {
      console.error(">>> [DEBUG 7 - GLOBAL FLOW CATCH]:", error.message, error.stack, error);
      return { 
        answer: "Lo siento, tuve un inconveniente al procesar tu consulta. Por favor intenta de nuevo o contacta al negocio directamente.", 
        source: 'fallback' 
      };
    }
  }
);
