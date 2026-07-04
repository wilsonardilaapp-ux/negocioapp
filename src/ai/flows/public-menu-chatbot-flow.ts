'use server';

/**
 * @fileOverview Flujo de Genkit para el chatbot del menú público.
 * Implementa una jerarquía de respuesta (Manual -> Info Negocio -> Catálogo -> IA Global).
 */

import { ai } from '@/ai/genkit';
import { getAdminFirestore } from '@/firebase/server-init';
import { 
  PublicMenuChatbotInputSchema, 
  PublicMenuChatbotOutputSchema, 
  type PublicMenuChatbotOutput 
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
  async (input) => {
    const db = await getAdminFirestore();
    const { businessId, question } = input;
    const lowQuestion = question.toLowerCase().trim();

    // --- PASO 1: RESPUESTAS PERSONALIZADAS ---
    const responsesSnap = await db.collection(`businesses/${businessId}/publicMenuChatbot/responses`)
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
        if (businessData.description) infoMsg += `\nSobre nosotros: ${businessData.description}`;
        return { answer: infoMsg, source: 'business_info' };
      }
    }

    // --- PASO 3: CATÁLOGO DENORMALIZADO (LECTURA RÁPIDA) ---
    const catalogSnap = await db.collection(`businesses/${businessId}/publicData`).doc('catalog').get();
    const catalogData = catalogSnap.exists ? catalogSnap.data() : null;

    // --- PASO 4: IA GENERATIVA (USANDO MOTOR GLOBAL) ---
    
    // 4.1 Obtener configuración global de IA (SOLO LECTURA)
    const aiConfigSnap = await db.doc('integrations/chatbot-integrado-con-whatsapp-para-soporte-y-ventas').get();
    
    if (!aiConfigSnap.exists || aiConfigSnap.data()?.status !== 'active') {
      return { 
        answer: `Lo siento, el asistente no está disponible en este momento. Por favor contacta al negocio directamente${businessData?.phone ? ' al ' + businessData.phone : ''}.`, 
        source: 'fallback' 
      };
    }

    const aiData = aiConfigSnap.data();
    let fields: AIProviderFields = {};
    
    try {
      if (typeof aiData?.fields === 'string') {
        fields = JSON.parse(aiData.fields);
      } else {
        fields = aiData?.fields || {};
      }
    } catch (e) {
      console.error("[PMC-Flow] Error parsing AI fields:", e);
    }

    // 4.2 Determinar proveedor activo según prioridad
    let activeProvider: string | null = null;
    let apiKey: string | null = null;
    let modelName: string = 'gemini-1.5-flash';

    if (fields.google?.apiKey) {
      activeProvider = 'googleai';
      apiKey = fields.google.apiKey;
      modelName = 'gemini-1.5-flash';
    } else if (fields.openai?.apiKey) {
      activeProvider = 'openai';
      apiKey = fields.openai.apiKey;
      modelName = 'gpt-4o-mini';
    } else if (fields.groq?.apiKey) {
      activeProvider = 'groq';
      apiKey = fields.groq.apiKey;
      modelName = 'llama-3.1-8b-instant';
    }

    if (!activeProvider || !apiKey) {
      return { 
        answer: "Lo siento, no puedo procesar tu solicitud ahora. Por favor intenta más tarde.", 
        source: 'fallback' 
      };
    }

    // 4.3 Construir contexto para la IA
    const context = `
      NEGOCIO: ${businessData?.name || 'Nuestro negocio'}
      DESCRIPCIÓN: ${businessData?.description || ''}
      UBICACIÓN: ${businessData?.address || ''}
      CONTACTO: ${businessData?.phone || ''}
      
      PRODUCTOS Y PROMOCIONES:
      ${JSON.stringify(catalogData?.products || [])}
    `;

    // 4.4 Llamada a la IA
    try {
      const response = await ai.generate({
        model: `${activeProvider}/${modelName}`,
        system: `Eres el asistente virtual oficial del negocio ${businessData?.name || 'este establecimiento'}.
                Responde únicamente con la información de contexto proporcionada (negocio, catálogo, promociones).
                No inventes precios, promociones ni productos.
                Si no tienes la información, indica que el cliente puede contactar al negocio directamente al ${businessData?.phone || 'teléfono principal'}.`,
        prompt: `Contexto: ${context}\n\nPregunta del cliente: ${question}`,
        config: {
          temperature: 0.2, // Baja temperatura para mayor precisión
        }
      });

      return { 
        answer: response.text || "No pude generar una respuesta válida.", 
        source: 'ai_generated' 
      };
    } catch (aiError: any) {
      console.error("[PMC-Flow] GenAI Error:", aiError.message);
      return { 
        answer: "Hubo un problema técnico al procesar tu duda. Por favor contacta al negocio directamente.", 
        source: 'fallback' 
      };
    }
  }
);
