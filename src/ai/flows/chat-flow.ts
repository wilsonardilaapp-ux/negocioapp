'use server';
/**
 * @fileOverview Chatbot flow with RAG Absolute Blindage and detailed logging.
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
 * Función principal para generar respuestas del asistente.
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
 * Obtiene el contexto del negocio con blindaje total y timeout de 1s.
 * Retorna un string vacío si falla o excede el tiempo para no bloquear el flujo.
 */
async function getBusinessContext(businessId: string, userMessage: string): Promise<string> {
  try {
    console.log(`[PASO 3] [RAG-DEBUG] Iniciando búsqueda blindada (1s)...`);
    
    const result = await Promise.race([
      (async () => {
        // Bypass temporal del RAG para evitar bloqueos por latencia en Firestore
        // Si se desea restaurar, implementar consultas indexadas ultra-rápidas aquí.
        return ""; 
      })(),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_RAG')), 1000))
    ]);

    console.log(`[PASO 3.5] Búsqueda finalizada.`);
    return result;

  } catch (error: any) {
    console.warn(`[PASO 3-RESCATE] Continuando sin contexto RAG por: ${error.message}`);
    return ""; 
  }
}

/**
 * Obtiene la configuración de IA activa desde el panel global.
 */
export async function getAIConfig(businessId?: string): Promise<{ provider: string; apiKey: string; model: string }> {
  console.log(`[AI-CONFIG] Recuperando motor global...`);
  try {
    const firestore = await getAdminFirestore();
    const integrationSnap = await firestore.doc('integrations/chatbot-integrado-con-whatsapp-para-soporte-y-ventas').get();

    if (!integrationSnap.exists) {
      console.warn(`[AI-CONFIG] Integración no encontrada. Usando fallback.`);
      return { provider: 'googleai', apiKey: '', model: 'gemini-1.5-flash' };
    }

    const data = integrationSnap.data();
    let fields: any = {};
    if (typeof data?.fields === 'string') {
      try {
        fields = JSON.parse(data.fields);
      } catch (e) {
        fields = {};
      }
    } else {
      fields = data?.fields || {};
    }

    // Prioridad DeepSeek por costos y velocidad
    if (fields.deepseek?.apiKey) {
      console.log(`[AI-CONFIG] Proveedor: DeepSeek`);
      return { provider: 'deepseek', apiKey: fields.deepseek.apiKey, model: 'deepseek-chat' };
    }
    
    if (fields.google?.apiKey) {
      console.log(`[AI-CONFIG] Proveedor: Google AI`);
      return { provider: 'googleai', apiKey: fields.google.apiKey, model: 'gemini-1.5-flash' };
    }
    
    if (fields.openai?.apiKey) {
      console.log(`[AI-CONFIG] Proveedor: OpenAI`);
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
    // Paso 3 blindado: Garantiza que no se detenga el servidor
    await getBusinessContext(input.businessId, input.message);
    
    console.log(`[PASO 4] Resolviendo configuración de IA...`);
    const aiConfig = await getAIConfig(input.businessId);

    if (!aiConfig.apiKey) {
        console.error(`[CHAT-FLOW] [ERROR] Sin API Key para ${aiConfig.provider}`);
        return "Hola, no tengo acceso al cerebro de IA en este momento. Por favor, intenta más tarde.";
    }

    const systemPrompt = `Eres un asistente profesional. Responde de forma amable y concisa.
REGLAS:
1. Identifícate como el asistente oficial.
2. Si no sabes algo, pide al usuario esperar por un humano.
3. Responde siempre en español.`;

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
          config: { temperature: 0.1, apiKey: aiConfig.apiKey }
        });
        return response.text ?? "Hola, ¿en qué puedo ayudarte?";
      }

      // OpenAI / DeepSeek
      let endpoint = 'https://api.openai.com/v1/chat/completions';
      if (aiConfig.provider === 'deepseek') endpoint = 'https://api.deepseek.com/v1/chat/completions';

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
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Error API ${aiConfig.provider}: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "Hola, ¿cómo puedo ayudarte hoy?";
      
    } catch (e: any) {
      console.error(`[PASO 4-ERROR]:`, e.message);
      return "Lo siento, tuve un problema al procesar tu consulta.";
    }
  }
);