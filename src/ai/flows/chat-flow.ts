'use server';
/**
 * @fileOverview Chatbot flow with RAG Priority, hierarchical prompting and detailed source logging.
 * 
 * - Prioritizes Knowledge Base (RAG) over general AI knowledge.
 * - Implements a 4s timeout for database queries to prevent server freezes.
 */

import { ai } from '../genkit';
import { z } from 'genkit';
import { getAdminFirestore } from '../../firebase/server-init';

const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const ChatInputSchema = z.object({
  businessId: z.string(),
  history: z.array(MessageSchema),
  message: z.string(),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

/**
 * Main wrapper to handle the assistant response generation.
 */
export async function chat(input: ChatInput): Promise<string> {
  console.log(`[CHAT-FLOW] Llamada recibida para businessId: ${input.businessId}`);
  try {
    return await chatFlow(input);
  } catch (error: any) {
    console.error("[CHAT-FLOW] [ERROR-FATAL]:", error.message);
    return "Hola, soy el asistente virtual. Estoy teniendo un inconveniente técnico, por favor déjanos tu mensaje y te atenderemos pronto.";
  }
}

/**
 * Retrieves business context (Knowledge Base + Catalog) from Firestore with a safety timeout.
 */
async function getBusinessContext(businessId: string, userMessage: string): Promise<string> {
  try {
    console.log(`[PASO 3] [RAG-DEBUG] Iniciando búsqueda blindada (4s)...`);
    
    const result = await Promise.race([
      (async () => {
        const db = await getAdminFirestore();
        
        // Parallel fetching for performance
        const [kbSnap, catalogSnap] = await Promise.all([
          db.collection('businesses')
            .doc(businessId)
            .collection('chatbotConfig')
            .doc('main')
            .collection('knowledgeBase')
            .where('status', '==', 'ready')
            .get(),
          db.collection('businesses')
            .doc(businessId)
            .collection('publicData')
            .doc('catalog')
            .get()
        ]);

        let context = "";

        // 1. Add Catalog Data (Products, Prices)
        if (catalogSnap.exists) {
          const catData = catalogSnap.data();
          context += "CATÁLOGO DE PRODUCTOS:\n" + JSON.stringify(catData?.products || []) + "\n\n";
        }

        // 2. Add Knowledge Base (Manual entries and PDF extractions)
        if (!kbSnap.empty) {
          context += "BASE DE CONOCIMIENTO:\n";
          kbSnap.forEach(doc => {
            const data = doc.data();
            context += `TEMA: ${data.fileName}\nCONTENIDO: ${data.extractedText || data.content || ""}\n\n`;
          });
        }

        return context;
      })(),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_RAG')), 4000))
    ]);

    console.log(`[PASO 3.5] [RAG-DEBUG] Contexto construido exitosamente (${result.length} bytes)`);
    return result;

  } catch (error: any) {
    console.warn(`[PASO 3-RESCATE] Continuando sin contexto RAG por: ${error.message}`);
    return ""; 
  }
}

/**
 * Fetches active AI configuration from the global integration panel.
 */
export async function getAIConfig(businessId?: string): Promise<{ provider: string; apiKey: string; model: string }> {
  try {
    const firestore = await getAdminFirestore();
    const integrationSnap = await firestore.doc('integrations/chatbot-integrado-con-whatsapp-para-soporte-y-ventas').get();

    if (!integrationSnap.exists) {
      return { provider: 'googleai', apiKey: '', model: 'gemini-1.5-flash' };
    }

    const data = integrationSnap.data();
    let fields: any = {};
    try {
      fields = typeof data?.fields === 'string' ? JSON.parse(data.fields) : (data?.fields || {});
    } catch (e) {
      fields = {};
    }

    if (fields.deepseek?.apiKey) {
      return { provider: 'deepseek', apiKey: fields.deepseek.apiKey, model: 'deepseek-chat' };
    }
    
    if (fields.google?.apiKey) {
      return { provider: 'googleai', apiKey: fields.google.apiKey, model: 'gemini-1.5-flash' };
    }
    
    if (fields.openai?.apiKey) {
      return { provider: 'openai', apiKey: fields.openai.apiKey, model: 'gpt-4o-mini' };
    }
  } catch (e: any) {
    console.error("[AI-CONFIG] [ERROR]:", e.message);
  }

  return { provider: 'googleai', apiKey: '', model: 'gemini-1.5-flash' };
}

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    // Step 3: Hierarchical Context Building
    const businessContext = await getBusinessContext(input.businessId, input.message);
    const hasKnowledge = businessContext && businessContext.trim().length > 0;

    // Logging the selected source for verification
    if (hasKnowledge) {
      console.log("[PASO 4] Fuente de respuesta: Base de Conocimiento");
    } else {
      console.log("[PASO 4] Fuente de respuesta: IA general (sin match en Base de Conocimiento)");
    }
    
    const aiConfig = await getAIConfig(input.businessId);

    if (!aiConfig.apiKey) {
        console.error(`[CHAT-FLOW] [ERROR] Sin API Key para ${aiConfig.provider}`);
        return "Hola, no tengo acceso al cerebro de IA en este momento. Por favor, intenta más tarde.";
    }

    const systemPrompt = `Eres el asistente virtual oficial del negocio. 
Tu objetivo es ayudar a los clientes con respuestas precisas, amables y profesionales.

REGLAS DE PRIORIDAD:
1. **FUENTE PRIORITARIA (Base de Conocimiento)**: Analiza el contexto proporcionado en la 'Base de Conocimiento' para responder. Si la respuesta se encuentra allí, utilízala como fuente única y obligatoria.
2. **RESPALDO (Conocimiento General)**: Solo si la información NO está presente en la Base de Conocimiento o esta se encuentra vacía, utiliza tu conocimiento general para dar una respuesta útil.
3. **TRANSPARENCIA**: Si respondes basándote en conocimiento general para una pregunta específica del negocio (como precios, políticas o stock) que no está en la base, indícalo amablemente ("Basado en información general...") y sugiere contactar a un humano para detalles exactos.
4. **TONO**: Profesional, empático y conciso.
5. **IDIOMA**: Responde siempre en español.

Base de Conocimiento:
${businessContext}`;

    try {
      console.log(`[PASO 4.1] Generando texto con ${aiConfig.provider}...`);
      
      if (aiConfig.provider === 'googleai') {
        const response = await ai.generate({
          model: `googleai/${aiConfig.model}`,
          messages: [
            { role: 'system', content: [{ text: systemPrompt }] },
            ...input.history.map(h => ({ role: h.role, content: [{ text: h.content }] })),
            { role: 'user', content: [{ text: input.message }] }
          ],
          config: { temperature: 0.2, apiKey: aiConfig.apiKey }
        });
        return response.text ?? "Hola, ¿en qué puedo ayudarte?";
      }

      // Fallback for OpenAI / DeepSeek
      const endpoint = aiConfig.provider === 'deepseek' 
        ? 'https://api.deepseek.com/v1/chat/completions' 
        : 'https://api.openai.com/v1/chat/completions';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${aiConfig.apiKey}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          model: aiConfig.model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...input.history.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.content })),
            { role: 'user', content: input.message }
          ],
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Error API ${aiConfig.provider}: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || "Hola, ¿cómo puedo ayudarte hoy?";
      console.log(`[PASO 4.5] Respuesta generada con éxito.`);
      return aiResponse;
      
    } catch (e: any) {
      console.error(`[PASO 4-ERROR]:`, e.message);
      return "Lo siento, tuve un problema al procesar tu consulta.";
    }
  }
);
