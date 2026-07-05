
'use server';

/**
 * @fileOverview Flujo de Genkit para el chatbot del menú público.
 * Implementa una jerarquía de respuesta (Manual -> Info Negocio -> Catálogo -> IA Global).
 * Corregido para usar rutas de 5 segmentos en colecciones.
 */

import { ai } from '@/ai/genkit';
import { getAdminFirestore } from '@/firebase/server-init';
import { 
  PublicMenuChatbotInputSchema, 
  PublicMenuChatbotOutputSchema, 
  PublicMenuChatbotOutput
} from '@/models/public-menu-chatbot';
import type { AIProviderFields } from '@/models/integration';

/**
 * Flujo principal del chatbot del menú público.
 */
export const publicMenuChatbotFlow = ai.defineFlow(
  {
    name: 'publicMenuChatbotFlow',
    inputSchema: PublicMenuChatbotInputSchema,
    outputSchema: PublicMenuChatbotOutputSchema,
  },
  async (input): Promise<PublicMenuChatbotOutput> => {
    const db = await getAdminFirestore();
    const { businessId, question } = input;
    const lowQuestion = question.toLowerCase().trim();

    // --- PASO 1: RESPUESTAS PERSONALIZADAS (Ruta de 5 segmentos) ---
    const responsesSnap = await db.collection(`businesses/${businessId}/publicMenuChatbot/main/responses`)
      .where('isActive', '==', true)
      .get();
    
    const matchedCustom = responsesSnap.docs.find(doc => {
      const data = doc.data();
      return lowQuestion.includes(data.question.toLowerCase().trim());
    });

    if (matchedCustom) {
      return { answer: matchedCustom.data().answer, source: 'custom_response' };
    }

    // --- PASO 2: INFORMACIÓN DEL NEGOCIO ---
    const businessSnap = await db.collection('businesses').doc(businessId).get();
    const businessData = businessSnap.exists ? businessSnap.data() : null;

    if (businessData) {
      const infoTriggers = ['donde queda', 'ubicación', 'direccion', 'teléfono', 'contacto', 'whatsapp', 'horario', 'redes'];
      const isAskingInfo = infoTriggers.some(t => lowQuestion.includes(t));

      if (isAskingInfo) {
        let infoMsg = `Estamos ubicados en ${businessData.address || 'nuestra sede principal'}. `;
        if (businessData.phone) infoMsg += `Puedes contactarnos al ${businessData.phone}. `;
        return { answer: infoMsg, source: 'business_info' };
      }
    }

    // --- PASO 3: CATÁLOGO DENORMALIZADO ---
    const catalogSnap = await db.collection(`businesses/${businessId}/publicData`).doc('catalog').get();
    const catalogData = catalogSnap.exists ? catalogSnap.data() : null;

    // --- PASO 4: IA GENERATIVA (USANDO MOTOR GLOBAL) ---
    const aiConfigSnap = await db.doc('integrations/chatbot-integrado-con-whatsapp-para-soporte-y-ventas').get();
    
    if (!aiConfigSnap.exists || aiConfigSnap.data()?.status !== 'active') {
      return { 
        answer: `Lo siento, el asistente no está disponible en este momento.`, 
        source: 'fallback' 
      };
    }

    const aiData = aiConfigSnap.data();
    let fields: AIProviderFields = {};
    
    try {
      fields = typeof aiData?.fields === 'string' ? JSON.parse(aiData.fields) : (aiData?.fields || {});
    } catch (e) {
      console.error("[PMC-Flow] Error parsing AI fields:", e);
    }

    let activeProvider: string | null = null;
    let apiKey: string | null = null;
    let modelName: string = 'gemini-1.5-flash';

    if (fields.google?.apiKey) {
      activeProvider = 'googleai'; apiKey = fields.google.apiKey;
    } else if (fields.openai?.apiKey) {
      activeProvider = 'openai'; apiKey = fields.openai.apiKey; modelName = 'gpt-4o-mini';
    } else if (fields.groq?.apiKey) {
      activeProvider = 'groq'; apiKey = fields.groq.apiKey; modelName = 'llama-3.1-8b-instant';
    }

    if (!activeProvider || !apiKey) {
      return { answer: "Lo siento, no puedo procesar tu solicitud ahora.", source: 'fallback' };
    }

    const context = `
      NEGOCIO: ${businessData?.name || 'Nuestro negocio'}
      DESCRIPCIÓN: ${businessData?.description || ''}
      PRODUCTOS: ${JSON.stringify(catalogData?.products || [])}
    `;

    try {
      const response = await ai.generate({
        model: `${activeProvider}/${modelName}`,
        system: `Eres el asistente de ${businessData?.name || 'este establecimiento'}. Responde con el contexto. No inventes precios.`,
        prompt: `Contexto: ${context}\n\nPregunta: ${question}`,
        config: { temperature: 0.2 }
      });

      return { answer: response.text || "No pude generar una respuesta.", source: 'ai_generated' };
    } catch (aiError) {
      return { answer: "Hubo un problema técnico al procesar tu duda.", source: 'fallback' };
    }
  }
);
