'use server';
/**
 * @fileOverview A chatbot flow using Genkit with Absolute Shielding.
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
 * Recuperación de datos (RAG) con blindaje absoluto.
 * Implementa un timeout estricto de 1 segundo para evitar bloqueos del servidor.
 */
async function getBusinessContext(businessId: string, userMessage: string): Promise<string> {
  const logPrefix = `[PASO 3] [RAG-DEBUG]`;
  console.log(`${logPrefix} Iniciando búsqueda blindada (1s)...`);

  try {
    // 1. Definir el temporizador de rescate (1 segundo)
    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT_RAG')), 1000)
    );

    // 2. Definir la promesa de búsqueda real en Firestore
    const contextPromise = (async () => {
      try {
        const db = await getAdminFirestore();
        
        // Obtener descripción del negocio, documentos y catálogo en paralelo
        const [businessSnap, knowledgeSnap, catalogSnap] = await Promise.all([
          db.collection('businesses').doc(businessId).get(),
          db.collection('businesses').doc(businessId).collection('chatbotConfig').doc('main').collection('knowledgeBase').where('status', '==', 'ready').get(),
          db.collection('businesses').doc(businessId).collection('publicData').doc('catalog').get()
        ]);

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

        return context;
      } catch (innerError: any) {
        console.warn(`${logPrefix} Error en consulta Firestore: ${innerError.message}`);
        return "";
      }
    })();

    // 3. Carrera contra el tiempo: El primero que termine gana
    return await Promise.race([contextPromise, timeoutPromise]);

  } catch (error: any) {
    // RESCATE ABSOLUTO: Si falla la búsqueda o el timeout de 1s, devolvemos vacío inmediatamente
    console.warn(`${logPrefix} Rescate activado: ${error.message}. Continuando al Paso 4 sin documentos.`);
    return ""; 
  }
}

/**
 * Obtiene la configuración de IA activa desde el panel global.
 * Prioriza DeepSeek para optimización de costos.
 */
export async function getAIConfig(businessId?: string): Promise<{ provider: string; apiKey: string; model: string }> {
  try {
    const firestore = await getAdminFirestore();
    
    // Buscar en integraciones globales
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

    // PRIORIDAD 1: DeepSeek (Costo-Efectivo)
    if (fields.deepseek?.apiKey) {
      return { provider: 'deepseek', apiKey: fields.deepseek.apiKey, model: 'deepseek-chat' };
    }
    
    // PRIORIDAD 2: Google AI (Gemini)
    if (fields.google?.apiKey) {
      return { provider: 'googleai', apiKey: fields.google.apiKey, model: 'gemini-1.5-flash' };
    }
    
    // PRIORIDAD 3: OpenAI
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
    // PASO 3: Búsqueda blindada con timeout de 1s
    const contextData = await getBusinessContext(input.businessId, input.message);
    
    // PASO 4: Configurar motor de IA y generar respuesta
    const aiConfig = await getAIConfig(input.businessId);

    if (!aiConfig.apiKey) {
      return "Hola, soy el asistente del Salón de Belleza Natural. No encontré esa info en mis manuales, ¿en qué más te ayudo?";
    }

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
      return data.choices?.[0]?.message?.content || "Hola, soy el asistente del Salón de Belleza Natural. ¿En qué puedo ayudarte?";
    } catch (e: unknown) {
      return "Hola, soy el asistente del Salón de Belleza Natural. No pude procesar tu duda, ¿en qué más te ayudo?";
    }
  }
);
