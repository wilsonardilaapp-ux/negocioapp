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
    // [BOT-MUST-SPEAK] Fallback de emergencia si todo falla
    return "Hola, soy el asistente del Salón de Belleza Natural. Estoy teniendo unos problemas técnicos momentáneos, pero puedes escribirnos directamente por este medio y un asesor te atenderá pronto.";
  }
}

// --- RECUPERACIÓN DE DATOS (RAG) CON TIMEOUT Y LOGS DETALLADOS ---
async function getBusinessContext(businessId: string, userMessage: string): Promise<string> {
  console.log(`[RAG-DEBUG] Iniciando búsqueda para el negocio ${businessId} con el mensaje: ${userMessage}`);
  
  try {
    const firestore = await getAdminFirestore();

    // 1. Obtener Nombre Real del Negocio desde el Perfil
    const businessDoc = await firestore.collection('businesses').doc(businessId).get();
    const businessName = businessDoc.exists ? businessDoc.data()?.name : "Salón de Belleza Natural";

    // 2. Base de Conocimiento (Documentos PDF y Manuales)
    let knowledgeBaseContent = "";
    try {
      const knowledgeQuery = firestore.collection(`businesses/${businessId}/chatbotConfig/main/knowledgeBase`);
      const knowledgeSnap = await knowledgeQuery.get();
      
      console.log(`[RAG-DEBUG] Fragmentos encontrados en Base de Conocimientos: ${knowledgeSnap.size}`);

      knowledgeBaseContent = knowledgeSnap.docs.map(d => {
        const data = d.data();
        const content = data.extractedText || data.content || "";
        const title = data.fileName || data.title || "Información";
        return `--- TEMA: ${title} ---\n${content}\n`;
      }).join('\n');
    } catch (innerError: any) {
      console.error(`[RAG-ERROR] Error buscando en documentos: ${innerError.message}`);
    }

    // 3. Catálogo de Productos y Servicios
    const productsQuery = firestore.collection(`businesses/${businessId}/products`).limit(30);
    const productsSnap = await productsQuery.get();

    const productsContent = productsSnap.docs.map(d => {
      const p = d.data();
      return `- ${p.name || 'Producto'}: $${p.price || 'Consultar'} - ${p.description || ''}`;
    }).join('\n');

    return `
INFORMACIÓN DEL NEGOCIO: ${businessName}

[BASE DE CONOCIMIENTOS]
${knowledgeBaseContent || "No hay manuales cargados actualmente."}

[SERVICIOS Y PRODUCTOS DISPONIBLES]
${productsContent || "Catálogo no disponible."}
`;
  } catch (error: any) {
    console.error(`[RAG-ERROR] Error fatal en recuperación de contexto: ${error.message}`);
    return "";
  }
}

/**
 * Obtiene la configuración de IA activa desde el panel global.
 * PRIORIDAD ABSOLUTA: DeepSeek para ahorro de costos.
 */
export async function getAIConfig(businessId?: string): Promise<{ provider: string; apiKey: string; model: string }> {
  try {
    const firestore = await getAdminFirestore();
    
    // Consulta a la configuración global del Super Admin
    const globalConfigSnap = await firestore.doc('globalConfig/config_ia').get();
    const integrationSnap = await firestore.doc('integrations/chatbot-integrado-con-whatsapp-para-soporte-y-ventas').get();

    const configDoc = globalConfigSnap.exists ? globalConfigSnap : integrationSnap;

    if (!configDoc.exists) {
      console.error("[AI-ERROR] No hay motor de IA activo en el panel de Super Admin.");
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

    // --- REGLA DE PRIORIDAD: DeepSeek primero para ahorro de costos ---
    if (fields.deepseek?.apiKey) {
      return { provider: 'deepseek', apiKey: fields.deepseek.apiKey, model: 'deepseek-chat' };
    }
    
    // Fallbacks
    if (fields.google?.apiKey) {
      return { provider: 'googleai', apiKey: fields.google.apiKey, model: 'gemini-1.5-flash' };
    }
    
    if (fields.openai?.apiKey) {
      return { provider: 'openai', apiKey: fields.openai.apiKey, model: 'gpt-4o-mini' };
    }
    
    if (fields.groq?.apiKey) {
      return { provider: 'groq', apiKey: fields.groq.apiKey, model: 'llama-3.1-8b-instant' };
    }

    console.error("[AI-ERROR] No se encontró ninguna API Key configurada (DeepSeek, Gemini, etc.)");

  } catch (e: any) {
    console.error("[AI-ERROR] Fallo al leer configuración IA:", e.message);
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
      return "Lo siento, el servicio de asistencia no está configurado correctamente.";
    }

    // [POLÍTICA DE NO ALUCINACIÓN Y RESPUESTA OBLIGATORIA]
    const systemPrompt = `Eres un asistente profesional del Salón de Belleza Natural. 
Responde ÚNICAMENTE basándote en el CONTEXTO proporcionado.

REGLAS CRÍTICAS:
1. Si el mensaje del usuario es un simple saludo (hola, buenos días, buenas tardes), responde amablemente presentándote como el Asistente del Salón de Belleza Natural y pregúntale en qué puedes ayudarle. Para responder a los saludos, NO necesitas buscar en el contexto.
2. Para cualquier otra pregunta sobre el negocio, usa ESTRICTAMENTE el contexto de la base de conocimientos proporcionada en el bloque CONTEXTO ACTUAL DEL NEGOCIO.
3. Si la información solicitada no está explícitamente en el CONTEXTO y no es un saludo, responde EXACTAMENTE: "Hola, soy el asistente del Salón de Belleza Natural. No encontré esa info en mis manuales, ¿en qué más te ayudo?"
4. NO uses tu conocimiento general para inventar respuestas sobre el negocio.
5. NO inventes precios ni servicios que no aparezcan en el CONTEXTO.
6. Si el CONTEXTO está vacío o es insuficiente para una respuesta veraz y no es un saludo, aplica la Regla 3.

CONTEXTO ACTUAL DEL NEGOCIO:
"""
${contextData}
"""`;

    // Caso Google AI
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
      return response.text ?? "Hola, soy el asistente del Salón de Belleza Natural. No encontré esa info en mis manuales, ¿en qué más te ayudo?";
    }

    // Fallback para otros proveedores (DeepSeek, OpenAI, Groq)
    try {
      let endpoint = 'https://api.openai.com/v1/chat/completions';
      if (aiConfig.provider === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions';
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
      return data.choices?.[0]?.message?.content || "Hola, soy el asistente del Salón de Belleza Natural. No encontré esa info en mis manuales, ¿en qué más te ayudo?";
    } catch (e) {
      return "Hola, soy el asistente del Salón de Belleza Natural. No encontré esa info en mis manuales, ¿en qué más te ayudo?";
    }
  }
);