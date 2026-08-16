'use server';

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
    console.error("Error crítico en chatFlow:", error);
    return "Hola, soy el asistente del Salón de Belleza Natural. Estoy teniendo unos problemas técnicos momentáneos, pero puedes escribirnos directamente por este medio y un asesor te atenderá pronto.";
  }
}

/**
 * Recuperación de datos (RAG) con BLINDAJE ABSOLUTO.
 * Implementa un timeout de 1s y rescate global para evitar bloqueos del flujo.
 */
async function getBusinessContext(businessId: string, userMessage: string): Promise<string> {
  console.log(`[PASO 3] [RAG-DEBUG] Iniciando búsqueda blindada (1s) para el negocio ${businessId}`);
  
  try {
    // Temporizador de seguridad: 1 segundo máximo
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT_RAG')), 1000)
    );

    const fetchPromise = (async () => {
      try {
        const firestore = await getAdminFirestore();

        const businessDoc = await firestore.collection('businesses').doc(businessId).get();
        const businessName = businessDoc.exists ? businessDoc.data()?.name : "Salón de Belleza Natural";

        let knowledgeBaseContent = "";
        let productsContent = "";

        const [knowledgeSnap, productsSnap] = await Promise.all([
          firestore.collection(`businesses/${businessId}/chatbotConfig/main/knowledgeBase`).get(),
          firestore.collection(`businesses/${businessId}/products`).limit(20).get()
        ]);

        knowledgeBaseContent = knowledgeSnap.docs.map(d => {
          const data = d.data();
          return `--- TEMA: ${data.fileName || "Info"} ---\n${data.extractedText || data.content || ""}\n`;
        }).join('\n');

        productsContent = productsSnap.docs.map(d => {
          const p = d.data();
          return `- ${p.name}: $${p.price || 'Consultar'} - ${p.description || ''}`;
        }).join('\n');

        return `
INFORMACIÓN DEL NEGOCIO: ${businessName}

[BASE DE CONOCIMIENTOS]
${knowledgeBaseContent || "No hay manuales cargados."}

[CATÁLOGO]
${productsContent || "Catálogo no disponible."}
`;
      } catch (innerError) {
        console.error("[RAG-FETCH-INTERNAL-ERROR]", innerError);
        return "";
      }
    })();

    // Competencia contra el reloj: Si tarda más de 1s, salta el catch
    const context = await Promise.race([fetchPromise, timeoutPromise]);
    console.log(`[RAG-SUCCESS] Contexto recuperado.`);
    return context;

  } catch (error: unknown) {
    // RESCATE OBLIGATORIO: Jamás permitir que este bloque detenga el webhook
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn(`[RAG-ERROR-CRITICO] Fallo o Timeout (1s): ${errorMsg}. Continuando al Paso 4 sin contexto.`);
    
    // Retornamos vacío para que la IA responda con conocimiento general
    return ""; 
  }
}

/**
 * Obtiene la configuración de IA activa desde el panel global.
 */
export async function getAIConfig(businessId?: string): Promise<{ provider: string; apiKey: string; model: string }> {
  try {
    const firestore = await getAdminFirestore();
    
    const globalConfigSnap = await firestore.doc('globalConfig/config_ia').get();
    const integrationSnap = await firestore.doc('integrations/chatbot-integrado-con-whatsapp-para-soporte-y-ventas').get();

    const configDoc = globalConfigSnap.exists ? globalConfigSnap : integrationSnap;

    if (!configDoc.exists) {
      return { provider: 'googleai', apiKey: '', model: 'gemini-1.5-flash' };
    }

    const data = configDoc.data();
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

    if (fields.deepseek?.apiKey) {
      return { provider: 'deepseek', apiKey: fields.deepseek.apiKey, model: 'deepseek-chat' };
    }
    
    if (fields.google?.apiKey) {
      return { provider: 'googleai', apiKey: fields.google.apiKey, model: 'gemini-1.5-flash' };
    }
    
    if (fields.openai?.apiKey) {
      return { provider: 'openai', apiKey: fields.openai.apiKey, model: 'gpt-4o-mini' };
    }

  } catch (e: unknown) {
    console.error("[AI-CONFIG-ERROR]", e);
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
    // PASO 3: Recuperar contexto con protección absoluta de 1s
    const contextData = await getBusinessContext(input.businessId, input.message);
    
    // PASO 4: Configurar motor de IA y generar respuesta
    const aiConfig = await getAIConfig(input.businessId);

    if (!aiConfig.apiKey) {
      return "Hola, soy el asistente del Salón de Belleza Natural. No encontré esa info en mis manuales, ¿en qué más te ayudo?";
    }

    const systemPrompt = `Eres un asistente profesional del Salón de Belleza Natural. 
Responde ÚNICAMENTE basándote en el CONTEXTO proporcionado.

REGLAS CRÍTICAS:
1. Si el mensaje del usuario es un simple saludo (hola, buenos días), preséntate como el Asistente del Salón de Belleza Natural.
2. Para preguntas sobre el negocio, usa ESTRICTAMENTE el contexto proporcionado.
3. Si la información no está en el CONTEXTO y no es un saludo, responde: "Hola, soy el asistente del Salón de Belleza Natural. No encontré esa info en mis manuales, ¿en qué más te ayudo?"
4. NO uses conocimiento general para inventar precios o servicios.

CONTEXTO ACTUAL DEL NEGOCIO:
"""
${contextData}
"""`;

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
      return response.text ?? "Hola, soy el asistente del Salón de Belleza Natural. ¿En qué puedo ayudarte?";
    }

    // Fallback compatible con OpenAI (DeepSeek)
    try {
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
      return data.choices?.[0]?.message?.content || "Hola, soy el asistente del Salón de Belleza Natural. ¿En qué puedo ayudarte?";
    } catch (e: unknown) {
      return "Hola, soy el asistente del Salón de Belleza Natural. No pude procesar tu duda, ¿en qué más te ayudo?";
    }
  }
);