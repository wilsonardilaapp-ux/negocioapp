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
    console.error("Error técnico en chatFlow:", error.message);
    return "Lo siento, estoy teniendo problemas técnicos. Por favor, intenta de nuevo en unos minutos.";
  }
}

// --- RECUPERACIÓN DE DATOS (RAG) ---
async function getBusinessContext(businessId: string): Promise<string> {
  try {
    const firestore = await getAdminFirestore();

    // 1. Obtener Nombre Real del Negocio desde el Perfil
    const businessDoc = await firestore.collection('businesses').doc(businessId).get();
    const businessName = businessDoc.exists ? businessDoc.data()?.name : "Salón de Belleza Natural";

    // 2. Base de Conocimiento (Documentos PDF y Manuales)
    const knowledgeQuery = firestore.collection(`businesses/${businessId}/chatbotConfig/main/knowledgeBase`);
    const knowledgeSnap = await knowledgeQuery.get();

    console.log(`[RAG-DEBUG] Encontrados ${knowledgeSnap.size} fragmentos de conocimiento para el negocio ${businessId}`);

    const knowledgeContent = knowledgeSnap.docs.map(d => {
      const data = d.data();
      const content = data.extractedText || data.content || "";
      const title = data.fileName || data.title || "Información";
      const imageInfo = data.fileUrl ? `\n[LINK DE IMAGEN/DOCUMENTO: ${data.fileUrl}]` : "";
      return `--- TEMA: ${title} ---\n${content}${imageInfo}\n`;
    }).join('\n');

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
${knowledgeContent}

[SERVICIOS Y PRODUCTOS DISPONIBLES]
${productsContent}
`;
  } catch (error) {
    console.error("Error recuperando contexto DB:", error);
    return "";
  }
}

/**
 * Obtiene la configuración de IA activa desde el panel global.
 * Prioriza la colección indicada por el usuario para control de Super Admin.
 */
export async function getAIConfig(businessId?: string): Promise<{ provider: string; apiKey: string; model: string }> {
  try {
    const firestore = await getAdminFirestore();
    
    // Consulta a la configuración global del Super Admin
    const globalConfigSnap = await firestore.doc('globalConfig/config_ia').get();
    
    // Fallback a la integración estándar si no existe la global
    const integrationSnap = await firestore.doc('integrations/chatbot-integrado-con-whatsapp-para-soporte-y-ventas').get();

    const configDoc = globalConfigSnap.exists ? globalConfigSnap : integrationSnap;

    if (!configDoc.exists) {
      console.error("[AI-ERROR] No hay motor de IA activo en el panel de Super Admin.");
      return { provider: 'openai', apiKey: '', model: 'gpt-4o-mini' };
    }

    const data = configDoc.data();
    let fields: any = {};
    if (typeof data?.fields === 'string') {
      fields = JSON.parse(data.fields);
    } else {
      fields = data?.fields || {};
    }

    // Identificar motor 'Activo' (Selección dinámica basada en la presencia de API Key)
    if (fields.google?.apiKey) return { provider: 'googleai', apiKey: fields.google.apiKey, model: 'gemini-1.5-flash' };
    if (fields.openai?.apiKey) return { provider: 'openai', apiKey: fields.openai.apiKey, model: 'gpt-4o-mini' };
    if (fields.groq?.apiKey) return { provider: 'groq', apiKey: fields.groq.apiKey, model: 'llama-3.1-8b-instant' };
    if (fields.deepseek?.apiKey) return { provider: 'deepseek', apiKey: fields.deepseek.apiKey, model: 'deepseek-chat' };

    console.error("[AI-ERROR] No se encontró ninguna API Key configurada en el motor global.");

  } catch (e: any) {
    console.error("[AI-ERROR] Fallo al intentar leer la configuración global:", e.message);
  }

  return { provider: 'openai', apiKey: '', model: 'gpt-4o-mini' };
}

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    console.log(`[RAG-DEBUG] Iniciando búsqueda para el negocio ${input.businessId} con el mensaje: ${input.message}`);
    const contextData = await getBusinessContext(input.businessId);
    const aiConfig = await getAIConfig(input.businessId);

    if (!aiConfig.apiKey) {
      return "Lo siento, el servicio de asistencia no está configurado. Por favor, contacta al administrador.";
    }

    // POLÍTICA DE NO ALUCINACIÓN ESTRICTA (REFORZADA)
    const systemPrompt = `Eres un asistente profesional del Salón de Belleza Natural. 
Responde ÚNICAMENTE basándote en el CONTEXTO proporcionado.

REGLAS CRÍTICAS:
1. Si la información solicitada no está explícitamente en el CONTEXTO (Base de Conocimiento o Catálogo), responde EXACTAMENTE: "Lo siento, no tengo esa información en mis registros. ¿Te gustaría que te comunique con un asesor humano?"
2. NO uses tu conocimiento general para inventar respuestas sobre el negocio.
3. NO inventes precios, horarios, promociones ni servicios que no aparezcan en el CONTEXTO.
4. Si el CONTEXTO está vacío, aplica la Regla 1.

CONTEXTO ACTUAL DEL NEGOCIO:
"""
${contextData}
"""`;

    // Implementación dinámica según proveedor
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
      return response.text ?? 'No pude generar una respuesta.';
    }

    // Fallback para proveedores compatibles con OpenAI (OpenAI, Groq, DeepSeek)
    try {
      let endpoint = 'https://api.openai.com/v1/chat/completions';
      if (aiConfig.provider === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions';
      else if (aiConfig.provider === 'deepseek') endpoint = 'https://api.deepseek.com/v1/chat/completions';

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
      return data.choices?.[0]?.message?.content || 'No pude generar una respuesta.';
    } catch (e) {
      console.error("Fallo en fetch de IA:", e);
      return "Hubo un error al conectar con el motor de inteligencia.";
    }
  }
);
