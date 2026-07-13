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

    // 1. Configuración
    const configDoc = await firestore.doc(`businesses/${businessId}/chatbotConfig/main`).get();
    const businessName = configDoc.exists ? configDoc.data()?.business?.name : "Ecosalud";

    // 2. Base de Conocimiento
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

    // 3. Productos
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

/**
 * Helper para verificar si un proveedor está en su rango de horas pico configurado.
 */
function isProviderInPeakHour(config: any): boolean {
  if (!config.peakHours || !Array.isArray(config.peakHours) || config.peakHours.length === 0) return false;
  
  try {
    const timezone = config.timezone || 'UTC';
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone,
    });
    
    const timeStr = formatter.format(new Date());
    // Normalización: algunas implementaciones retornan 24:xx en lugar de 00:xx
    const currentTime = timeStr === "24:00" ? "00:00" : timeStr;

    return config.peakHours.some((range: { start: string; end: string }) => {
      const { start, end } = range;
      if (!start || !end) return false;
      
      // Lógica de rango circular (cruce de medianoche)
      if (start <= end) {
        return currentTime >= start && currentTime <= end;
      } else {
        return currentTime >= start || currentTime <= end;
      }
    });
  } catch (e) {
    return false;
  }
}

/**
 * Obtiene la configuración de IA activa (API Key y Proveedor).
 * Se exporta para ser utilizada por otros servicios como el de recuperación.
 * Implementa balanceo inteligente por horas pico para optimización de costos.
 */
export async function getAIConfig(businessId?: string): Promise<{ provider: string; apiKey: string; model: string }> {
  try {
    const firestore = await getAdminFirestore();
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

    // Definición de proveedores en orden de prioridad SaaS
    const candidates = [
        { dbKey: 'openai', codeId: 'openai', model: 'gpt-4o-mini' },
        { dbKey: 'deepseek', codeId: 'deepseek', model: 'deepseek-chat' },
        { dbKey: 'groq', codeId: 'groq', model: 'llama-3.1-8b-instant' },
        { dbKey: 'google', codeId: 'googleai', model: 'gemini-2.0-flash' }
    ];

    let fallbackWithKey: { provider: string; apiKey: string; model: string } | null = null;

    for (const cand of candidates) {
        const config = fields[cand.dbKey];
        if (!config?.apiKey) continue;

        // Guardamos el primer proveedor válido como red de seguridad (Servicio > Costo)
        if (!fallbackWithKey) {
            fallbackWithKey = { provider: cand.codeId, apiKey: config.apiKey, model: cand.model };
        }

        // Validación de optimización por horas pico
        if (config.avoidInPeakHours && isProviderInPeakHour(config)) {
            console.log(`[IA Optimization] Saltando proveedor ${cand.dbKey} por política de horas pico en zona ${config.timezone || 'UTC'}.`);
            continue;
        }

        // Si tiene llave y NO está en hora pico, se elige inmediatamente
        return { provider: cand.codeId, apiKey: config.apiKey, model: cand.model };
    }

    // Si llegamos aquí y tenemos un fallback, es porque todos los disponibles están en hora pico.
    // Priorizamos el servicio sobre el costo.
    if (fallbackWithKey) return fallbackWithKey;

  } catch (e: any) {
    console.error("Error getting AI config from Firestore:", e.message);
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

    const contextData = await getBusinessContext(input.businessId);

    if (contextData.includes("ADVERTENCIA")) {
      return "Error de Permisos: Ve a la consola de Firebase -> Firestore -> Reglas y cambia 'allow read' a true.";
    }

    const aiConfig = await getAIConfig(input.businessId);

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

    if (aiConfig.provider === 'googleai') {
      const response = await ai.generate({
        model: `googleai/${aiConfig.model}`,
        messages: [
          { role: 'system', content: [{ text: systemPrompt }] },
          { role: 'user', content: [{ text: userMessage }] }
        ],
        config: {
          temperature: 0.1,
          apiKey: aiConfig.apiKey,
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      });
      return response.text ?? 'Error.';
    }

    try {
      let endpoint = 'https://api.openai.com/v1/chat/completions';
      if (aiConfig.provider === 'groq') {
        endpoint = 'https://api.groq.com/openai/v1/chat/completions';
      } else if (aiConfig.provider === 'deepseek') {
        endpoint = 'https://api.deepseek.com/v1/chat/completions';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${aiConfig.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            ...input.history.slice(-2).map(m => ({
              role: m.role === 'model' ? 'assistant' : 'user',
              content: m.content
            })),
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