'use server';
/**
 * @fileOverview A chatbot flow using Genkit with Absolute Shielding and Traceability.
 * 
 * - chat - A function that generates a response from the assistant.
 * - ChatInput - The input type for the chat function.
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
    console.error("Error crítico en chatFlow:", error);
    return "Hola, soy el asistente del Salón de Belleza Natural. Estoy teniendo unos problemas técnicos momentáneos, pero puedes escribirnos directamente por este medio y un asesor te atenderá pronto.";
  }
}

/**
 * Recuperación de datos (RAG) con blindaje absoluto y trazabilidad.
 */
async function getBusinessContext(businessId: string, userMessage: string): Promise<string> {
  const logPrefix = `[PASO 3] [RAG-DEBUG]`;
  console.log(`${logPrefix} [3.1] Iniciando búsqueda blindada (1s)...`);

  // BLINDAJE ABSOLUTO: Try/Catch que envuelve todo el proceso de búsqueda
  try {
    // 1. Definir el temporizador de rescate (1 segundo para evitar colapsos en producción)
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT_RAG')), 1000)
    );

    // 2. Definir la promesa de búsqueda real en Firestore
    const contextPromise = (async () => {
      try {
        console.log(`${logPrefix} [3.2] Conectando a Admin Firestore...`);
        const db = await getAdminFirestore();
        console.log(`${logPrefix} [3.3] Ejecutando consultas paralelas...`);
        
        // Obtener descripción del negocio, documentos y catálogo en paralelo
        const [businessSnap, knowledgeSnap, catalogSnap] = await Promise.all([
          db.collection('businesses').doc(businessId).get(),
          db.collection('businesses').doc(businessId).collection('chatbotConfig').doc('main').collection('knowledgeBase').where('status', '==', 'ready').get(),
          db.collection('businesses').doc(businessId).collection('publicData').doc('catalog').get()
        ]);

        console.log(`${logPrefix} [3.4] Consultas completadas. Procesando resultados...`);

        let context = `INFORMACIÓN DEL NEGOCIO: ${businessSnap.exists ? businessSnap.data()?.description : ''}\n\n`;
        
        knowledgeSnap.forEach(doc => {
          const data = doc.data();
          if (data.extractedText) context += `DOCUMENTO: ${data.fileName}\nCONTENIDO: ${data.extractedText}\n---\n`;
          if (data.isManual && data.content) context += `TEMA: ${data.fileName}\nINFO: ${data.content}\n---\n`;
        });

        if (catalogSnap.exists) {
          const catalogData = catalogSnap.data();
          context += `PRODUCTOS DISPONIBLES:\n${JSON.stringify(catalogData?.products || [])}\n`;
        }

        console.log(`${logPrefix} [3.5] Contexto construido exitosamente (${context.length} bytes)`);
        return context;
      } catch (innerError: any) {
        console.error(`${logPrefix} [3.2-ERROR] Fallo en consulta Firestore: ${innerError.message}`);
        return "";
      }
    })();

    // 3. Carrera contra el tiempo: Si Firestore tarda > 1s, se aborta y se rescata el flujo
    return await Promise.race([contextPromise, timeoutPromise]);

  } catch (error: any) {
    // RESCATE OBLIGATORIO: Nunca permitir que el fallo de documentos frene la respuesta
    console.warn(`${logPrefix} [3-RESCATE] Activado por: ${error.message}. Saltando al Paso 4...`);
    return ""; 
  }
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
    // PASO 3: Búsqueda blindada (con timeout de 1s)
    const contextData = await getBusinessContext(input.businessId, input.message);
    
    // PASO 4: Configurar motor de IA
    const aiConfig = await getAIConfig(input.businessId);

    if (!aiConfig.apiKey) {
      console.warn(`[PASO 4-ERROR] No se encontró API Key para el proveedor configurado.`);
      return "Hola, soy el asistente del Salón de Belleza Natural. No encontré esa info en mis manuales, ¿en qué más te ayudo?";
    }

    console.log(`[PASO 5] Generando respuesta con ${aiConfig.provider} (${aiConfig.model})...`);

    const systemPrompt = `Eres un asistente profesional del Salón de Belleza Natural. 
Responde de forma amable y profesional.

CONTEXTO DEL NEGOCIO:
${contextData || 'Usa tu conocimiento general para responder de forma amable.'}

REGLAS CRÍTICAS:
1. Si el mensaje del usuario es un simple saludo (hola, buenos días), preséntate como el Asistente del Salón de Belleza Natural.
2. Si preguntan por precios o servicios específicos y no están en el contexto, diles amablemente que un asesor humano les brindará la información exacta en un momento.
3. Mantén un tono servicial en todo momento.
4. Responde en español de forma natural.`;

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

    // Fallback compatible con OpenAI (DeepSeek/GPT)
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
      const answer = data.choices?.[0]?.message?.content;
      return answer || "Hola, soy el asistente del Salón de Belleza Natural. ¿En qué puedo ayudarte?";
    } catch (e: any) {
      console.error(`[PASO 5-ERROR] Error en generación externa: ${e.message}`);
      return "Hola, soy el asistente del Salón de Belleza Natural. No pude procesar tu duda, ¿en qué más te ayudo?";
    }
  }
);
