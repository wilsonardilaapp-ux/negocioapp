'use server';

/**
 * @fileOverview Flujo de Genkit para el chatbot del menú público.
 * Implementa una jerarquía de respuesta resiliente (Manual -> Info Negocio -> Catálogo -> IA Global).
 * Aísla las respuestas directas de la lógica de IA para evitar regresiones totales.
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

    // --- PASO 1: RESPUESTAS PERSONALIZADAS (AISLADO) ---
    try {
      const responsesSnap = await db.collection(`businesses/${businessId}/publicMenuChatbot/main/responses`)
        .where('isActive', '==', true)
        .get();
      
      const matchedCustom = responsesSnap.docs.find(doc => {
        const data = doc.data();
        return lowQuestion.includes(data.question?.toLowerCase().trim() || '');
      });

      if (matchedCustom) {
        return { answer: matchedCustom.data().answer, source: 'custom_response' };
      }
    } catch (e) {
      console.warn("[Chatbot] Error in custom responses lookup:", e);
      // Continuamos al siguiente paso en lugar de fallar
    }

    // --- PASO 2: INFORMACIÓN DEL NEGOCIO (INCLUYE TELÉFONO - AISLADO) ---
    let businessName = "nuestro negocio";
    let businessDescription = "";
    let isPlatformBot = false;

    try {
      const businessSnap = await db.collection('businesses').doc(businessId).get();
      if (businessSnap.exists) {
        const businessData = businessSnap.data();
        businessName = businessData?.nombre || businessData?.name || businessData?.businessName || "nuestro negocio";
        businessDescription = businessData?.description || "";
        isPlatformBot = businessData?.isPlatformBot === true;

        const infoTriggers = ['donde queda', 'ubicación', 'direccion', 'teléfono', 'contacto', 'whatsapp', 'horario', 'redes'];
        const isAskingInfo = infoTriggers.some(t => lowQuestion.includes(t));

        if (isAskingInfo) {
          let infoMsg = `Estamos ubicados en ${businessData?.address || 'nuestra sede principal'}. `;
          if (businessData?.phone) infoMsg += `Puedes contactarnos al ${businessData.phone}. `;
          return { answer: infoMsg, source: 'business_info' };
        }
      }
    } catch (e) {
      console.warn("[Chatbot] Error in business info lookup:", e);
    }

    // --- PASO 3 & 4: IA GENERATIVA (BLOQUE CON RECUPEARACIÓN ANTE FALLOS) ---
    try {
      // Obtener Catálogo
      const catalogSnap = await db.collection(`businesses/${businessId}/publicData`).doc('catalog').get();
      const catalogData = catalogSnap.exists ? catalogSnap.data() : null;

      // Obtener Configuración de IA con Blindaje
      const aiConfigSnap = await db.doc('integrations/chatbot-integrado-con-whatsapp-para-soporte-y-ventas').get();
      
      const aiData = aiConfigSnap.exists ? aiConfigSnap.data() : null;
      let fields: AIProviderFields = {};
      
      if (aiData?.fields) {
        try {
          fields = typeof aiData.fields === 'string' ? JSON.parse(aiData.fields) : (aiData.fields || {});
        } catch (e) {
          console.error("[PMC-Flow] Error parsing AI fields:", e);
        }
      }

      let activeProvider: string = 'googleai';
      let apiKey: string | null = null;
      let modelName: string = 'gemini-1.5-flash';

      // Resolución segura de proveedor y llave (Encadenamiento opcional estricto)
      if (fields?.google?.apiKey) {
        activeProvider = 'googleai'; 
        apiKey = fields.google.apiKey;
      } else if (fields?.openai?.apiKey) {
        activeProvider = 'openai'; 
        apiKey = fields.openai.apiKey; 
        modelName = 'gpt-4o-mini';
      } else if (fields?.groq?.apiKey) {
        activeProvider = 'groq'; 
        apiKey = fields.groq.apiKey; 
        modelName = 'llama-3.1-8b-instant';
      }

      // FALLBACK CRÍTICO: Si no hay llave en Firestore, intentar usar variables de entorno del sistema
      const finalApiKey = apiKey || process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;

      if (!finalApiKey && !isPlatformBot) {
        return { 
          answer: "Lo siento, el servicio de inteligencia no está configurado correctamente en este momento.", 
          source: 'fallback' 
        };
      }

      // Mapeo defensivo del catálogo de productos
      const products = catalogData?.products || [];
      const safeProducts = Array.isArray(products) ? products : Object.values(products || {});
      const formattedCatalog = safeProducts.map((p: any) => 
        `- ${p?.nombre || p?.name || 'Producto'}: $${p?.precio ?? p?.price ?? 0} (${p?.categoria || p?.category || 'General'})`
      ).join('\n');

      const context = `
        NEGOCIO: ${businessName}
        DESCRIPCIÓN: ${businessDescription}
        PRODUCTOS DISPONIBLES EN EL CATÁLOGO:
        ${formattedCatalog || 'No hay productos disponibles actualmente.'}
      `;

      const systemPrompt = isPlatformBot 
        ? "Eres el asistente de Markix, una plataforma SaaS. Responde con el contexto entregado (planes, precios, funciones). No inventes precios ni funciones que no estén en el contexto."
        : `Eres el asistente de ${businessName}. Responde con el contexto de forma amable y concisa. No inventes precios.`;

      // Llamada a la IA en su propio sub-bloque
      try {
        const response = await ai.generate({
          model: `${activeProvider}/${modelName}`,
          system: systemPrompt,
          prompt: `Contexto: ${context}\n\nPregunta: ${question}`,
          config: { 
            temperature: 0.2,
            apiKey: finalApiKey || undefined
          }
        });

        return { answer: response.text || "No pude generar una respuesta.", source: 'ai_generated' };
      } catch (aiError: any) {
        console.error("[Chatbot AI Generate Error]:", aiError.message);
        return { 
          answer: "Lo siento, el motor de inteligencia está saturado o mal configurado. Por favor contacta al soporte del negocio.", 
          source: 'fallback' 
        };
      }
    } catch (error: any) {
      console.error("[Chatbot Logic Error]:", error);
      return { answer: "Lo siento, el asistente está teniendo dificultades técnicas en este momento.", source: 'fallback' };
    }
  }
);