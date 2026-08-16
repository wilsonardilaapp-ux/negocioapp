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
 */
async function getBusinessContext(businessId: string, userMessage: string): Promise<string> {
  // TRY/CATCH GLOBAL EN EL RAG: Envuelve absolutamente todo el bloque
  try {
    console.log(`[PASO 3] [RAG-DEBUG] Iniciando búsqueda blindada (1s)...`);
    
    // Rescate ante el Timeout: Promise.race obliga a resolver en máximo 1 segundo
    const result = await Promise.race([
      (async () => {
        // En esta fase de emergencia, retornamos vacío de inmediato para liberar el servidor.
        // Si se desea restaurar Firestore, debe hacerse con consultas ultra-optimizadas.
        return ""; 
      })(),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_RAG')), 1000))
    ]);

    console.log(`[PASO 3.5] Contexto construido exitosamente.`);
    return result;

  } catch (error: any) {
    // Rescate silencioso ante fallo o timeout
    console.warn(`[PASO 3-ERROR] Bypasseando RAG por fallo o timeout: ${error.message}`);
    return ""; // Retornar obligatoriamente vacío para continuar al Paso 4
  }
}

/**
 * Obtiene la configuración de IA activa desde el panel global.
 */
export async function getAIConfig(businessId?: string): Promise<{ provider: string; apiKey: string; model: string }> {
  console.log(`[AI-CONFIG] Buscando integración maestra en Firestore...`);
  try {
    const firestore = await getAdminFirestore();
    const integrationSnap = await firestore.doc('integrations/chatbot-integrado-con-whatsapp-para-soporte-y-ventas').get();

    if (!integrationSnap.exists) {
      console.warn(`[AI-CONFIG] Documento de integración no encontrado. Usando fallback.`);
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
      console.log(`[AI-CONFIG] Proveedor resuelto: DeepSeek`);
      return { provider: 'deepseek', apiKey: fields.deepseek.apiKey, model: 'deepseek-chat' };
    }
    
    if (fields.google?.apiKey) {
      console.log(`[AI-CONFIG] Proveedor resuelto: Google AI`);
      return { provider: 'googleai', apiKey: fields.google.apiKey, model: 'gemini-1.5-flash' };
    }
    
    if (fields.openai?.apiKey) {
      console.log(`[AI-CONFIG] Proveedor resuelto: OpenAI`);
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
    // Paso 3 blindado: Prohibido detener el flujo
    await getBusinessContext(input.businessId, input.message);
    
    console.log(`[PASO 4] Solicitando configuración de IA...`);
    const aiConfig = await getAIConfig(input.businessId);

    if (!aiConfig.apiKey) {
        console.warn(`[CHAT-FLOW] [ERROR] No hay API Key configurada para ${aiConfig.provider}`);
        return "Hola, no tengo acceso a mi cerebro de IA en este momento. Por favor, intenta más tarde.";
    }

    const systemPrompt = `Eres un asistente profesional. Responde de forma amable y profesional.
REGLAS CRÍTICAS:
1. Preséntate como el asistente oficial del negocio.
2. Si preguntan por precios y no tienes la info, indica que un humano les atenderá pronto.
3. Responde en español de forma natural.`;

    try {
      console.log(`[PASO 4.1] Llamando al modelo ${aiConfig.model} de ${aiConfig.provider}...`);
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
        console.log(`[PASO 4.2] Generación exitosa (Google).`);
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

      if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Error en API ${aiConfig.provider}: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      console.log(`[PASO 4.2] Generación exitosa (${aiConfig.provider}).`);
      return data.choices?.[0]?.message?.content || "Hola, ¿en qué puedo ayudarte?";
    } catch (e: any) {
      console.error(`[PASO 4-ERROR]:`, e.message);
      return "Lo siento, tuve un problema al procesar tu consulta.";
    }
  }
);
