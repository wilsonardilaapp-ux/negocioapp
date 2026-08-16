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
 * Función principal para generar respuestas del chatbot.
 * Implementa RAG y políticas estrictas de no alucinación.
 */
export async function chat(input: ChatInput): Promise<string> {
  try {
    return await chatFlow(input);
  } catch (error: any) {
    console.error("Error crítico en chatFlow:", error.message);
    return "Hola, soy el asistente del Salón de Belleza Natural. Estoy teniendo unos problemas técnicos momentáneos, pero puedes escribirnos directamente por este medio y un asesor te atenderá pronto.";
  }
}

/**
 * Recuperación de datos (RAG) con TIMEOUT ULTRA-RÁPIDO de 1 segundo.
 * Bypass absoluto: Si falla o tarda más de 1s, salta de inmediato a la IA general.
 */
async function getBusinessContext(businessId: string, userMessage: string): Promise<string> {
  console.log(`[PASO 3] [RAG-DEBUG] Iniciando búsqueda relámpago (1s) para el negocio ${businessId}`);
  
  // Temporizador de seguridad: 1 segundo máximo para evitar bloqueos del webhook
  const timeoutPromise = new Promise<string>((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT_RAG')), 1000)
  );

  const fetchPromise = (async () => {
    try {
      const firestore = await getAdminFirestore();

      // 1. Obtener Nombre Real del Negocio
      const businessDoc = await firestore.collection('businesses').doc(businessId).get();
      const businessName = businessDoc.exists ? businessDoc.data()?.name : "Salón de Belleza Natural";

      // 2. Base de Conocimiento y Catálogo
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
    } catch (error: any) {
      throw error;
    }
  })();

  try {
    // COMPETICIÓN: La búsqueda contra el reloj de 1s
    const context = await Promise.race([fetchPromise, timeoutPromise]);
    console.log(`[RAG-SUCCESS] Contexto recuperado a tiempo.`);
    return context as string;
  } catch (error: any) {
    // BYPASS ABSOLUTO POR LENTITUD: Si Firestore es lento o falla, no bloqueamos el bot.
    console.error('[RAG-ERROR-CRITICO] Fallo o Timeout en 1s:', error.message || error);
    
    // Retorno de contexto mínimo para que el PASO 4 proceda sin demoras
    return `Información del negocio: Salón de Belleza Natural.`;
  }
}

/**
 * Obtiene la configuración de IA activa desde el panel global.
 * PRIORIDAD ABSOLUTA: DeepSeek para ahorro de costos.
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

    // PRIORIDAD 1: DeepSeek (Ahorro de costos)
    if (fields.deepseek?.apiKey) {
      return { provider: 'deepseek', apiKey: fields.deepseek.apiKey, model: 'deepseek-chat' };
    }
    
    // PRIORIDAD 2: Google
    if (fields.google?.apiKey) {
      return { provider: 'googleai', apiKey: fields.google.apiKey, model: 'gemini-1.5-flash' };
    }
    
    // PRIORIDAD 3: OpenAI
    if (fields.openai?.apiKey) {
      return { provider: 'openai', apiKey: fields.openai.apiKey, model: 'gpt-4o-mini' };
    }

  } catch (e: any) {
    console.error("[AI-CONFIG-ERROR]", e.message);
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
    // PASO 3: Recuperar contexto con protección absoluta de 1s contra latencia
    const contextData = await getBusinessContext(input.businessId, input.message);
    
    // PASO 4: Configurar motor de IA y generar respuesta
    const aiConfig = await getAIConfig(input.businessId);

    if (!aiConfig.apiKey) {
      console.error("[PASO 4] [AI-FATAL] No se puede generar respuesta sin API Key.");
      return "Hola, soy el asistente del Salón de Belleza Natural. No encontré esa info en mis manuales, ¿en qué más te ayudo?";
    }

    const systemPrompt = `Eres un asistente profesional del Salón de Belleza Natural. 
Responde ÚNICAMENTE basándote en el CONTEXTO proporcionado.

REGLAS CRÍTICAS:
1. Si el mensaje del usuario es un simple saludo (hola, buenos días), preséntate como el Asistente del Salón de Belleza Natural y pregunta en qué puedes ayudar. No necesitas buscar en el contexto para saludar.
2. Para preguntas sobre el negocio, usa ESTRICTAMENTE el contexto proporcionado.
3. Si la información no está en el CONTEXTO y no es un saludo, responde: "Hola, soy el asistente del Salón de Belleza Natural. No encontré esa info en mis manuales, ¿en qué más te ayudo?"
4. NO uses conocimiento general para inventar precios o servicios.

CONTEXTO ACTUAL DEL NEGOCIO:
"""
${contextData}
"""`;

    console.log(`[PASO 4] Generando respuesta con motor: ${aiConfig.provider}`);

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
      const textResponse = data.choices?.[0]?.message?.content;
      
      if (!textResponse) {
        throw new Error("Respuesta vacía del proveedor compatible con OpenAI");
      }

      return textResponse;
    } catch (e) {
      console.error("[PASO 4] [AI-ERROR-DESPACHO]", e);
      return "Hola, soy el asistente del Salón de Belleza Natural. No pude procesar tu duda, ¿en qué más te ayudo?";
    }
  }
);