'use server';

/**
 * @fileOverview Flujo de Genkit para el chatbot del menú público con ejecución determinista de agendamiento.
 * 
 * - Elimina la arquitectura de Tool Calling para evitar errores de registro duplicado.
 * - Implementa extracción estructurada de datos y guardado directo vía Firebase Admin SDK.
 * - Integra Capas 1, 2 y 3 (getAIConfig) para una gobernanza total.
 * - Implementa Tenant Resolver de 3 pasos para manejar Slugs con tildes y longitudes variables.
 * - Corrige Error 400 de Gemini pasando el system prompt como propiedad raíz.
 * - Actualizado a gemini-3.6-flash.
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

/**
 * Esquema interno para la extracción de datos de reserva por parte de la IA.
 */
const BookingExtractionSchema = z.object({
  answer: z.string().describe('Respuesta textual para el cliente'),
  intent: z.enum(['chat', 'booking']).describe('Intención detectada: charla general o reserva'),
  extractedData: z.object({
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    serviceName: z.string().optional(),
    date: z.string().optional().describe('Formato YYYY-MM-DD'),
    startTime: z.string().optional().describe('Formato HH:mm (24h)'),
    isComplete: z.boolean().describe('Verdadero solo si nombre, teléfono, servicio, fecha y hora están presentes'),
  }).optional(),
});

/**
 * Calcula la hora de fin sumando la duración a la hora de inicio.
 * Helper interno para evitar dependencias circulares o externas en el servidor.
 */
function calculateEndTimeInternal(startTime: string, duration: number): string {
    const [h, m] = startTime.split(':').map(Number);
    const date = new Date();
    date.setHours(h || 0, (m || 0) + duration, 0);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
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
    
    const db = await getAdminFirestore();

    // --- CAPA 0: RESOLUCIÓN DE TENANT (Tenant Resolver de 3 Pasos) ---
    let canonicalBusinessId = businessId;
    const directDoc = await db.collection('businesses').doc(businessId).get();
    
    if (!directDoc.exists && businessId !== 'platform-bot') {
      // Intento 1: Búsqueda por slug exacto
      let slugQuery = await db.collection('businesses').where('slug', '==', businessId).limit(1).get();
      
      if (slugQuery.empty) {
        // Intento 2: Búsqueda por slug normalizado (sin tildes, lowercase)
        const cleanSlug = businessId.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        slugQuery = await db.collection('businesses').where('slug', '==', cleanSlug).limit(1).get();
      }

      if (!slugQuery.empty) {
        canonicalBusinessId = slugQuery.docs[0].id;
      }
    }
    businessId = canonicalBusinessId;
    
    // --- CAPA 1: AUTOMATIZACIÓN LOCAL (Respuestas Predeterminadas) ---
    try {
      const responsesSnap = await db.collection(`businesses/${businessId}/publicMenuChatbot/main/responses`)
        .where('isActive', '==', true).get();
      const matchedCustom = responsesSnap.docs.find(doc => lowQuestion.includes(doc.data().question?.toLowerCase().trim() || ''));
      if (matchedCustom) return { answer: matchedCustom.data().answer, source: 'custom_response' };
    } catch (e) {}

    // --- CAPA 2: CONOCIMIENTO DEL NEGOCIO (Catálogo y Servicios) ---
    const [businessSnap, catalogSnap, servicesSnap] = await Promise.all([
        db.collection('businesses').doc(businessId).get(),
        db.collection(`businesses/${businessId}/publicData`).doc('catalog').get(),
        db.collection(`businesses/${businessId}/bookingServices`).where('isActive', '==', true).get()
    ]);

    const bData = businessSnap.data();
    const products = catalogSnap.data()?.products || [];
    const services = servicesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id }));

    const formattedCatalog = products.map((p: any) => `- ${p.name}: $${p.price}`).join('\n');
    const formattedServices = services.map((s: any) => `- ${s.name}: $${s.price} (${s.durationMinutes} min)`).join('\n');

    // --- CAPA 3: CONFIGURACIÓN IA (Motor Maestro del Super Admin) ---
    const aiConfig = await getAIConfig(businessId);
    let resolvedApiKey = (aiConfig.apiKey || '').trim();
    
    // Fallback de seguridad hacia variables de entorno
    if (!resolvedApiKey.startsWith('AIza')) {
      resolvedApiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || '').trim();
    }

    const systemPrompt = `Eres el asistente virtual oficial de "${bData?.name || 'Nuestro Negocio'}".

SERVICIOS DISPONIBLES PARA AGENDAR:
${formattedServices}

CATÁLOGO DE PRODUCTOS:
${formattedCatalog}

REGLAS DE AGENDAMIENTO:
1. Si el cliente quiere una cita, debes capturar: Nombre, WhatsApp, Servicio, Fecha y Hora.
2. Si falta información, pídela amablemente en el campo 'answer'.
3. Si tienes los 5 datos, marca 'isComplete: true' en el objeto JSON.
4. Fecha DEBE ser YYYY-MM-DD. Hora DEBE ser HH:mm (24h).

INSTRUCCIÓN TÉCNICA: Responde SIEMPRE siguiendo estrictamente el esquema JSON proporcionado.`;

    try {
      const response = await ai.generate({
        model: 'googleai/gemini-3.6-flash',
        output: { schema: BookingExtractionSchema },
        system: systemPrompt,
        messages: [
          ...history.map(h => ({ 
            role: (h.role === 'model' || h.role === 'assistant') ? 'model' as const : 'user' as const,
            content: [{ text: h.content }] 
          })),
          { role: 'user', content: [{ text: question }] }
        ],
        config: { temperature: 0.1, apiKey: resolvedApiKey }
      });

      const extracted = response.output;

      // --- CAPA 4: EJECUCIÓN DETERMINISTA (TypeScript Server-side) ---
      if (extracted?.intent === 'booking' && extracted.extractedData?.isComplete) {
        const data = extracted.extractedData;
        const reservationId = db.collection('placeholder').doc().id;

        // Intentar matchear con servicio real para obtener duración y precio
        const matchedService = services.find(s => 
            s.name.toLowerCase().includes(data.serviceName?.toLowerCase() || '')
        );

        const reservationPayload = {
          businessId: businessId,
          customerName: (data.customerName || 'Cliente').trim(),
          customerPhone: (data.customerPhone || '').trim(),
          serviceName: matchedService?.name || data.serviceName || 'Servicio solicitado',
          serviceId: matchedService?.id || 'chatbot_extracted',
          staffId: null,
          staffName: "Pendiente de asignación",
          date: data.date,
          startTime: data.startTime,
          endTime: calculateEndTimeInternal(data.startTime || '00:00', matchedService?.durationMinutes || 45),
          price: matchedService?.price || 0,
          durationMinutes: matchedService?.durationMinutes || 45,
          status: 'pending',
          source: 'chatbot',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Escritura física en Firestore (Admin SDK)
        await db.collection(`businesses/${businessId}/reservations`).doc(reservationId).set(reservationPayload);
        
        const confirmMsg = `¡Listo, ${data.customerName}! ✅ He agendado tu cita para ${reservationPayload.serviceName} el día ${data.date} a las ${data.startTime}. Tu ID de reserva es: ${reservationId.slice(-6).toUpperCase()}. ¡Te esperamos!`;
        
        return { answer: confirmMsg, source: 'ai_generated' };
      }

      return { 
        answer: extracted?.answer || "Entendido. ¿En qué más puedo ayudarte?", 
        source: 'ai_generated' 
      };

    } catch (error: any) {
      console.error("[Chatbot Pipeline Error]:", error.message);
      return { 
        answer: "Lo siento, tuve un inconveniente al procesar tu consulta. Por favor intenta de nuevo o contacta al negocio directamente.", 
        source: 'fallback' 
      };
    }
  }
);