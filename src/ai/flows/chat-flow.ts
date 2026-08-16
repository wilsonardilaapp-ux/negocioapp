
'use server';
/**
 * @fileOverview Chatbot flow with RAG Bypass for emergency recovery.
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
  try {
    return await chatFlow(input);
  } catch (error: unknown) {
    console.error("[ERROR-FATAL-CHAT]:", error);
    return "Hola, soy el asistente virtual. Estoy teniendo un inconveniente técnico, por favor déjanos tu mensaje y te atenderemos pronto.";
  }
}

/**
 * BYPASS TOTAL DEL RAG: Retorno instantáneo para evitar bloqueos de Firestore.
 */
async function getBusinessContext(businessId: string, userMessage: string): Promise<string> {
  console.log(`[PASO 3] RAG Bypasseado con éxito. Saltando al Paso 4...`);
  return ""; // Contexto vacío para forzar respuesta de IA general
}

/**
 * Obtiene la configuración de IA activa desde el panel global.
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
    if (typeof data?.fields === 'string') {
      try {
        fields = JSON.parse(data.fields);
      } catch (e) {
        fields = {};
      }
    } else {
      fields = data?.fields || {};
    }

    // Prioridad DeepSeek por costos y velocidad en producción
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
    console.error("[IA-CONFIG-ERROR]:", e.message);
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
    const contextData = await getBusinessContext(input.businessId, input.message);
    const aiConfig = await getAIConfig(input.businessId);

    if (!aiConfig.apiKey) {
      return "Hola, no tengo acceso a mi cerebro de IA en este momento. Por favor, intenta más tarde.";
    }

    const systemPrompt = `Eres un asistente profesional. Responde de forma amable y profesional.
REGLAS CRÍTICAS:
1. Preséntate como el asistente oficial del negocio.
2. Si preguntan por precios y no tienes la info, indica que un humano les atenderá pronto.
3. Responde en español de forma natural.`;

    try {
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

      // OpenAI / DeepSeek Flow
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

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "Hola, ¿en qué puedo ayudarte?";
    } catch (e: any) {
      return "Lo siento, tuve un problema al procesar tu consulta.";
    }
  }
);
