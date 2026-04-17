
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAdminFirestore } from '@/firebase/server-init';

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

export async function chat(input: ChatInput): Promise<string> {
  try {
    return await chatFlow(input);
  } catch (error) {
    console.error("Error técnico:", error);
    return "Lo siento, estoy teniendo problemas de conexión.";
  }
}

// --- RECUPERACIÓN DE DATOS ---
async function getBusinessContext(businessId: string): Promise<string> {
  try {
    const firestore = await getAdminFirestore();

    // 1. Configuración - Sintaxis Admin SDK
    const configDoc = await firestore.doc(`businesses/${businessId}/chatbotConfig/main`).get();
    const businessName = configDoc.exists ? configDoc.data()?.business?.name : "Ecosalud";

    // 2. Base de Conocimiento (Donde están tus ofertas manuales) - Sintaxis Admin SDK
    const knowledgeQuery = firestore.collection(`businesses/${businessId}/chatbotConfig/main/knowledgeBase`);
    const knowledgeSnap = await knowledgeQuery.get();

    const knowledgeContent = knowledgeSnap.docs.map(d => {
      const data = d.data();
      
      const content = data.extractedText || data.content || data.response || data.text || data.description || "";
      const title = data.fileName || data.title || "Oferta";

      let imageInfo = "";
      if (data.fileUrl) { 
          imageInfo = `\n[IMAGEN DISPONIBLE: ${data.fileUrl}]`;
      }

      return `--- TEMA: ${title} ---\n${content}${imageInfo}\n`;
    }).join('\n');

    // 3. Productos - Sintaxis Admin SDK
    const productsQuery = firestore.collection(`businesses/${businessId}/products`).limit(20);
    const productsSnap = await productsQuery.get();
    
    const productsContent = productsSnap.docs.map(d => {
        const p = d.data();
        let prodImage = "";
        if (p.imageUrl || p.image) prodImage = ` [IMAGEN DISPONIBLE: ${p.imageUrl || p.image}]`;
        
        return `- ${p.name || 'Producto'} ($${p.price || 'Consultar'}) ${prodImage} - ${p.description || ''}`;
    }).join('\n');

    if (!knowledgeContent && !productsContent) {
        return "ADVERTENCIA: No pude leer los datos. Verifica las Reglas de Seguridad de Firestore.";
    }

    return `
INFORMACIÓN DE ${businessName}:

[DOCUMENTOS Y OFERTAS]
${knowledgeContent}

[CATÁLOGO]
${productsContent}
`;
  } catch (error) {
    console.error("Error DB:", error);
    return "";
  }
}

async function getAIConfig(): Promise<{ provider: string; apiKey: string; model: string }> {
    try {
        const firestore = await getAdminFirestore();
        // Sintaxis Admin SDK
        const snap = await firestore.doc('integrations/chatbot-integrado-con-whatsapp-para-soporte-y-ventas').get();
        if (!snap.exists) {
            console.warn("Chatbot integration document not found. Falling back to default.");
            return { provider: 'openai', apiKey: '', model: 'gpt-4o-mini' };
        }
        
        const data = snap.data();
        if (!data || !data.fields) {
            console.warn("Chatbot integration document is empty or has no fields. Falling back to default.");
            return { provider: 'openai', apiKey: '', model: 'gpt-4o-mini' };
        }
        
        let fields: any = {};
        if (typeof data.fields === 'string' && data.fields.trim().startsWith('{')) {
            fields = JSON.parse(data.fields);
        } else if (typeof data.fields === 'object') {
            fields = data.fields;
        }
        
        if (fields.openai?.apiKey) return { provider: 'openai', apiKey: fields.openai.apiKey, model: 'gpt-4o-mini' };
        if (fields.groq?.apiKey) return { provider: 'groq', apiKey: fields.groq.apiKey, model: 'llama-3.1-8b-instant' };
        if (fields.google?.apiKey) return { provider: 'googleai', apiKey: fields.google.apiKey, model: 'gemini-1.5-flash' };
    } catch(e: any) {
        console.error("Error getting AI config from Firestore:", e.message);
    }
    
    return { provider: 'openai', apiKey: '', model: '' };
}

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    
    const contextData = await getBusinessContext(input.businessId);
    
    if (contextData.includes("ADVERTENCIA")) {
        return "Error de Permisos: Ve a la consola de Firebase -> Firestore -> Reglas y cambia 'allow read' a true.";
    }

    const aiConfig = await getAIConfig();
    
    const systemPrompt = `
Eres el Asistente de ${input.businessId}.

INSTRUCCIONES:
1. Responde basándote SOLO en el CONTEXTO.
2. Si ves "[IMAGEN DISPONIBLE: url]" y te piden foto/oferta, entrega esa URL.
3. Si el usuario pregunta "qué ofertas tienes", lee los documentos del contexto (Café, Colágeno, etc).
4. Sé amable.

CONTEXTO:
"""
${contextData}
"""
`;

    const userMessage = input.message;

    // Google AI
    if (aiConfig.provider === 'googleai') {
         const response = await ai.generate({
          model: `googleai/${aiConfig.model}`,
          messages: [
            { role: 'system', content: [{ text: systemPrompt }] }, 
            { role: 'user', content: [{ text: userMessage }] }
          ],
          config: { temperature: 0.1, apiKey: aiConfig.apiKey },
        });
        return response.text ?? 'Error.';
    }

    // OpenAI / Groq
    try {
        const endpoint = aiConfig.provider === 'groq' 
          ? 'https://api.groq.com/openai/v1/chat/completions' 
          : 'https://api.openai.com/v1/chat/completions';
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${aiConfig.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
                { role: 'system', content: systemPrompt },
                ...input.history.slice(-2).map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content })),
                { role: 'user', content: userMessage }
            ],
            model: aiConfig.model,
            temperature: 0.1,
          }),
        });
        const data = await response.json();
        return data.choices?.[0]?.message?.content || 'Error.';
    } catch (e) {
        return "Error de conexión.";
    }
  }
);
