'use server';

/**
 * @fileOverview Flujo de Genkit para el chatbot del menú público.
 * Implementa una jerarquía de respuesta resiliente y gobernanza de proveedores.
 * 1. Respuestas Manuales (Triggers exactos)
 * 2. Info Negocio (Teléfono/Dirección/Ubicación)
 * 3. Gobernanza Nivel 1: Validación de Activación (SaaS Inquilino)
 * 4. Gobernanza Nivel 2: Motor de IA con Fallback dinámico (Google -> OpenAI -> Groq)
 */

import { ai } from '@/ai/genkit';
import { getAdminFirestore } from '@/firebase/server-init';
import { 
  PublicMenuChatbotInputSchema, 
  PublicMenuChatbotOutputSchema, 
  PublicMenuChatbotOutput,
  DEFAULT_CHATBOT_CONFIG
} from '@/models/public-menu-chatbot';
import type { AIProviderFields } from '@/models/integration';

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

    // --- PASO 0: OBTENER CONFIGURACIÓN LOCAL DEL NEGOCIO ---
    const localConfigSnap = await db.doc(`businesses/${businessId}/publicMenuChatbot/main`).get();
    const localConfig = localConfigSnap.exists ? localConfigSnap.data() : DEFAULT_CHATBOT_CONFIG;

    // --- PASO 1: RESPUESTAS PERSONALIZADAS (Retorno Directo) ---
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
    }

    // --- PASO 2: INFORMACIÓN DEL NEGOCIO (Retorno Directo de Datos Estáticos) ---
    let businessName = "nuestro negocio";
    let businessDescription = "";
    try {
      const businessSnap = await db.collection('businesses').doc(businessId).get();
      if (businessSnap.exists) {
        const bData = businessSnap.data();
        businessName = bData?.name || bData?.nombre || "nuestro negocio";
        businessDescription = bData?.description || "";
        
        const infoTriggers = ['donde queda', 'ubicación', 'direccion', 'teléfono', 'contacto', 'whatsapp', 'horario', 'redes'];
        if (infoTriggers.some(t => lowQuestion.includes(t))) {
          let infoMsg = `Estamos ubicados en ${bData?.address || 'nuestra sede principal'}. `;
          if (bData?.phone) infoMsg += `Puedes contactarnos al ${bData.phone}. `;
          return { answer: infoMsg, source: 'business_info' };
        }
      }
    } catch (e) {
      console.warn("[Chatbot] Error in business info lookup:", e);
    }

    // --- PASO 3: GOBERNANZA NIVEL 1 (Autorización del Inquilino) ---
    // Si el negocio ha desactivado el bot, no permitimos el uso del motor de IA global.
    if (!localConfig.isActive) {
      return { 
        answer: "Lo siento, el asistente virtual está fuera de línea. Por favor utiliza nuestros números de contacto.", 
        source: 'fallback' 
      };
    }

    // --- PASO 4: MOTOR DE IA CON RESILIENCIA Y GOBERNANZA NIVEL 2 ---
    try {
      // 1. Obtener Catálogo denormalizado
      const catalogSnap = await db.collection(`businesses/${businessId}/publicData`).doc('catalog').get();
      const catalogData = catalogSnap.exists ? catalogSnap.data() : null;
      const products = catalogData?.products || [];
      const formattedCatalog = (Array.isArray(products) ? products : []).map((p: any) => 
        `- ${p?.name || 'Producto'}: $${p?.price ?? 0} (${p?.category || 'General'})`
      ).join('\n');

      // 2. Obtener Pool de Proveedores Globales (Super Admin)
      const aiConfigSnap = await db.doc('integrations/chatbot-integrado-con-whatsapp-para-soporte-y-ventas').get();
      const aiData = aiConfigSnap.exists ? aiConfigSnap.data() : null;
      
      let fields: AIProviderFields = {};
      if (typeof aiData?.fields === 'string') {
        try { fields = JSON.parse(aiData.fields); } catch { fields = {}; }
      } else {
        fields = (aiData?.fields || {}) as AIProviderFields;
      }

      // 3. Resolución de Pipeline de Ejecución (Google -> OpenAI -> Groq)
      const providersToTry = [
        { id: 'google', apiKey: fields.google?.apiKey, model: 'gemini-1.5-flash' },
        { id: 'openai', apiKey: fields.openai?.apiKey, model: 'gpt-4o-mini', endpoint: 'https://api.openai.com/v1/chat/completions' },
        { id: 'groq', apiKey: fields.groq?.apiKey, model: 'llama-3.1-8b-instant', endpoint: 'https://api.groq.com/openai/v1/chat/completions' }
      ].filter(p => !!p.apiKey);

      if (providersToTry.length === 0) {
        throw new Error("No hay proveedores de IA configurados en el Motor Maestro.");
      }

      const context = `
        NEGOCIO: ${businessName}
        DESCRIPCIÓN: ${businessDescription}
        CATÁLOGO DISPONIBLE:
        ${formattedCatalog || 'Consulta con un asesor para disponibilidad.'}
      `;

      const systemPrompt = `Eres el asistente virtual de ${businessName}. Responde de forma amable y muy concisa. No inventes precios ni productos. Usa el contexto proporcionado.`;

      // 4. Bucle de ejecución con Fallback Automático
      for (const provider of providersToTry) {
        try {
          console.log(`[Chatbot] Intentando resolución con: ${provider.id.toUpperCase()}`);
          
          if (provider.id === 'google') {
            const response = await ai.generate({
              model: `googleai/${provider.model}`,
              system: systemPrompt,
              prompt: `Contexto: ${context}\n\nPregunta: ${question}`,
              config: { temperature: 0.2, apiKey: provider.apiKey }
            });
            if (response.text) return { answer: response.text, source: 'ai_generated' };
          } else {
            // Ejecución vía Fetch para proveedores compatibles con OpenAI (OpenAI, Groq)
            const res = await fetch(provider.endpoint!, {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${provider.apiKey}`, 
                'Content-Type': 'application/json' 
              },
              body: JSON.stringify({
                model: provider.model,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: `Contexto: ${context}\n\nPregunta: ${question}` }
                ],
                temperature: 0.2,
                max_tokens: 300
              }),
            });
            
            if (res.ok) {
              const data = await res.json();
              const answer = data.choices?.[0]?.message?.content;
              if (answer) return { answer, source: 'ai_generated' };
            } else {
              const errorBody = await res.text();
              console.warn(`[Chatbot] Proveedor ${provider.id} respondió con error:`, errorBody);
            }
          }
        } catch (providerError) {
          console.error(`[Chatbot] Fallo crítico en proveedor ${provider.id}:`, providerError);
          // El bucle continúa al siguiente proveedor disponible
        }
      }

      throw new Error("Todos los proveedores del pool fallaron o están saturados.");

    } catch (error: any) {
      console.error("[Chatbot Pipeline Error]:", error.message);
      return { 
        answer: "Lo siento, el motor de inteligencia está teniendo dificultades técnicas. Por favor intenta de nuevo o contacta al negocio.", 
        source: 'fallback' 
      };
    }
  }
);