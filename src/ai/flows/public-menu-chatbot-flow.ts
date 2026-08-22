'use server';

/**
 * @fileOverview Flujo de Genkit para el chatbot del menú público.
 * Implementa una jerarquía de respuesta resiliente y gobernanza de proveedores.
 * 1. Respuestas Manuales (Triggers exactos)
 * 2. Info Negocio (Teléfono/Dirección/Ubicación)
 * 3. Gobernanza Nivel 1: Validación de Activación (SaaS Inquilino)
 * 4. Gobernanza Nivel 2: Motor de IA oficial de la plataforma (getAIConfig) con Memoria Conversacional.
 */

import { ai } from '@/ai/genkit';
import { getAdminFirestore } from '@/firebase/server-init';
import { 
  PublicMenuChatbotInputSchema, 
  PublicMenuChatbotOutputSchema, 
  PublicMenuChatbotOutput,
  DEFAULT_CHATBOT_CONFIG,
  PublicMenuChatbotConfig
} from '@/models/public-menu-chatbot';
import { getAIConfig } from './chat-flow';

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

    // --- PASO 0: OBTENER DATOS RAÍZ Y CONFIGURACIÓN ---
    const [businessSnap, localConfigSnap] = await Promise.all([
      db.collection('businesses').doc(businessId).get(),
      db.doc(`businesses/${businessId}/publicMenuChatbot/main`).get()
    ]);

    const bData = businessSnap.exists ? businessSnap.data() : null;
    const localConfig = (localConfigSnap.exists ? localConfigSnap.data() : DEFAULT_CHATBOT_CONFIG) as PublicMenuChatbotConfig;
    const isPlatformBot = bData?.isPlatformBot === true;

    // --- PASO 1: RESPUESTAS PERSONALIZADAS (Retorno Directo - Sin Memoria necesaria) ---
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

    // --- PASO 2: INFORMACIÓN DEL NEGOCIO (Retorno Directo) ---
    let businessName = bData?.name || bData?.nombre || "nuestro negocio";
    let businessDescription = bData?.description || "";
    
    if (bData) {
        const infoTriggers = ['donde queda', 'ubicación', 'direccion', 'teléfono', 'contacto', 'whatsapp', 'horario', 'redes'];
        if (infoTriggers.some(t => lowQuestion.includes(t))) {
          let infoMsg = `Estamos ubicados en ${bData?.address || 'nuestra sede principal'}. `;
          if (bData?.phone) infoMsg += `Puedes contactarnos al ${bData.phone}. `;
          return { answer: infoMsg, source: 'business_info' };
        }
    }

    // --- PASO 3: GOBERNANZA NIVEL 1 (Autorización del Inquilino) ---
    if (!isPlatformBot && !localConfig.isActive) {
      return { 
        answer: "Lo siento, el asistente virtual está fuera de línea. Por favor utiliza nuestros números de contacto.", 
        source: 'fallback' 
      };
    }

    // --- PASO 4: MOTOR DE IA OFICIAL DE MARKIX (Gobernanza Nivel 2 + MEMORIA) ---
    try {
      // 1. Obtener Catálogo denormalizado
      const catalogSnap = await db.collection(`businesses/${businessId}/publicData`).doc('catalog').get();
      const catalogData = catalogSnap.exists ? catalogSnap.data() : null;
      const products = catalogData?.products || [];
      const formattedCatalog = (Array.isArray(products) ? products : []).map((p: any) => 
        `- ${p?.name || 'Producto'}: $${p?.price ?? 0} (${p?.category || 'General'})`
      ).join('\n');

      // 2. Resolver Proveedor y Credenciales
      const aiConfig = await getAIConfig(businessId);

      if (!aiConfig.apiKey) {
        throw new Error("No hay API Key configurada para el motor de IA.");
      }

      const context = `
        NEGOCIO: ${businessName}
        DESCRIPCIÓN: ${businessDescription}
        CATÁLOGO DISPONIBLE:
        ${formattedCatalog || 'Consulta con un asesor para disponibilidad.'}
      `;

      const systemPrompt = isPlatformBot 
        ? `Eres el asistente virtual oficial de Markix. 
           Tu objetivo es explicar nuestros planes híbridos (Tarifa base mensual + % de comisión por cada pedido).
           Usa siempre el contexto del catálogo para dar precios exactos.
           PLANES DISPONIBLES:
           - Plan Gratis: $0 base + 15% comisión por pedido.
           - Básico: $19.900 base + 10% comisión por pedido.
           - Estándar: $39.900 base + 9% comisión por pedido.
           - Profesional: $69.900 base + 8% comisión por pedido.
           SÉ MUY CONCISO Y AMABLE. Explica que Markix solo cobra comisión por ventas reales generadas.
           Si preguntan por registro, diles que usen el botón "Empezar Gratis".`
        : `Eres el asistente virtual de ${businessName}. Responde de forma amable y muy concisa. No inventes precios ni productos. Usa el contexto proporcionado. Mantén la coherencia con el historial de la conversación.`;

      // Transformar historial local al formato de mensajes Genkit
      const formattedHistory = history.map(h => ({
        role: h.role === 'model' ? 'model' as const : 'user' as const,
        content: [{ text: h.content }]
      }));

      // 3. Ejecución Estandarizada según Proveedor
      if (aiConfig.provider === 'googleai') {
        const response = await ai.generate({
          model: `googleai/${aiConfig.model}`,
          messages: [
            { role: 'system', content: [{ text: systemPrompt }] },
            ...formattedHistory,
            { role: 'user', content: [{ text: `Contexto: ${context}\n\nPregunta actual: ${question}` }] }
          ],
          config: { 
            temperature: 0.2, 
            apiKey: aiConfig.apiKey 
          }
        });
        
        return { 
          answer: response.text || "Lo siento, no pude generar una respuesta clara. Intenta de nuevo.", 
          source: 'ai_generated' 
        };
      }

      // Fallback para proveedores compatibles con OpenAI (DeepSeek, etc.)
      const endpoint = aiConfig.provider === 'groq' 
        ? 'https://api.groq.com/openai/v1/chat/completions' 
        : (aiConfig.provider === 'deepseek' ? 'https://api.deepseek.com/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions');

      const fetchMessages = [
        { role: 'system', content: systemPrompt },
        ...history.map(h => ({
            role: h.role === 'model' ? 'assistant' : 'user',
            content: h.content
        })),
        { role: 'user', content: `Contexto: ${context}\n\nPregunta actual: ${question}` }
      ];

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${aiConfig.apiKey}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          model: aiConfig.model,
          messages: fetchMessages,
          temperature: 0.2,
          max_tokens: 300
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        const answer = data.choices?.[0]?.message?.content;
        if (answer) return { answer, source: 'ai_generated' };
      }

      throw new Error("El motor de IA no respondió exitosamente.");

    } catch (error: any) {
      console.error("[Chatbot Pipeline Error]:", error.message);
      return { 
        answer: "Lo siento, el motor de inteligencia está teniendo dificultades técnicas. Por favor intenta de nuevo o contacta al negocio.", 
        source: 'fallback' 
      };
    }
  }
);
