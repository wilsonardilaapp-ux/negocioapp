'use server';

/**
 * @fileOverview Flujo de Genkit para el chatbot del menú público con ejecución determinista de agendamiento.
 * 
 * - Implementa extracción por etiquetas [BOOKING_DATA: ...] para máxima resiliencia.
 * - Capa 0: Resolución de Tenant (Slug a UID) con normalización de tildes.
 * - Capa 5: Extracción robusta con Regex multilínea y validación de campos obligatorios.
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
 * Calcula la hora de fin sumando la duración a la hora de inicio.
 * Helper interno para evitar dependencias externas en el servidor.
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
      let slugQuery = await db.collection('businesses').where('slug', '==', businessId).limit(1).get();
      if (slugQuery.empty) {
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
    if (!resolvedApiKey.startsWith('AIza')) {
      resolvedApiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || '').trim();
    }

    const systemPrompt = `Eres el asistente virtual oficial de "${bData?.name || 'Nuestro Negocio'}".

SERVICIOS DISPONIBLES PARA AGENDAR:
${formattedServices}

CATÁLOGO DE PRODUCTOS:
${formattedCatalog}

REGLAS DE AGENDAMIENTO:
1. Si el cliente confirma Nombre, WhatsApp, Servicio, Fecha y Hora, responde amablemente y agrega AL FINAL en una sola línea:
[BOOKING_DATA: {"customerName":"...","customerPhone":"...","serviceName":"...","date":"YYYY-MM-DD","startTime":"HH:mm"}]
2. Si faltan datos, pídelos amablemente y NO agregues el tag de reserva.`;

    try {
      // --- CAPA 4: GENERACIÓN NATURAL (TEXTO) ---
      const response = await ai.generate({
        model: 'googleai/gemini-3.6-flash',
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

      const rawAnswer = response.text;

      // --- CAPA 5: EXTRACCIÓN Y PERSISTENCIA NATIVA ---
      const bookingRegex = /\[BOOKING_DATA:\s*({[\s\S]*?})\]/;
      const bookingMatch = rawAnswer.match(bookingRegex);
      
      if (bookingMatch && bookingMatch[1]) {
        try {
          const data = JSON.parse(bookingMatch[1]);
          const { customerName, customerPhone, serviceName, date, startTime } = data;

          // Validación de integridad: los 5 campos deben ser strings no vacíos
          if (
            typeof customerName === 'string' && customerName.trim() &&
            typeof customerPhone === 'string' && customerPhone.trim() &&
            typeof serviceName === 'string' && serviceName.trim() &&
            typeof date === 'string' && date.trim() &&
            typeof startTime === 'string' && startTime.trim()
          ) {
            // Resolver servicio real para obtener metadata financiera y técnica
            const matchedService = services.find(s => 
                s.name.toLowerCase().includes(serviceName.toLowerCase())
            );

            const reservationId = db.collection(`businesses/${businessId}/reservations`).doc().id;

            const reservationPayload = {
              businessId: businessId,
              customerName: customerName.trim(),
              customerPhone: customerPhone.trim(),
              serviceName: matchedService?.name || serviceName.trim(),
              serviceId: matchedService?.id || 'chatbot_extracted',
              staffId: null,
              staffName: "Pendiente de asignación",
              date: date.trim(),
              startTime: startTime.trim(),
              endTime: calculateEndTimeInternal(startTime.trim(), matchedService?.durationMinutes || 45),
              price: matchedService?.price || 0,
              durationMinutes: matchedService?.durationMinutes || 45,
              status: 'pending',
              source: 'chatbot',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            await db.collection(`businesses/${businessId}/reservations`).doc(reservationId).set(reservationPayload);
            
            // Limpieza del tag para la respuesta al usuario
            const cleanAnswer = rawAnswer.replace(bookingRegex, '').trim();
            return { answer: cleanAnswer, source: 'ai_generated' };
          } else {
            throw new Error("Missing required booking fields");
          }
        } catch (e) {
          console.warn("[Booking Parsing Error]:", e);
          // Si falla el parseo o validación, limpiamos el tag y devolvemos la respuesta conversacional
          const fallbackCleanAnswer = rawAnswer.replace(bookingRegex, '').trim();
          return { answer: fallbackCleanAnswer, source: 'ai_generated' };
        }
      }

      return { answer: rawAnswer, source: 'ai_generated' };

    } catch (error: any) {
      console.error("[Chatbot Pipeline Error]:", error.message);
      return { 
        answer: "Lo siento, tuve un inconveniente al procesar tu consulta. Por favor intenta de nuevo o contacta al negocio directamente.", 
        source: 'fallback' 
      };
    }
  }
);

/**
 * Función de utilidad preservada para el mapeo de datos de aplicación a formularios.
 * NO MODIFICAR para mantener compatibilidad con componentes externos.
 */
export async function mapAppToFormData(data: any) {
  if (!data) return {};
  return {
    ...data,
    mappedAt: new Date().toISOString()
  };
}