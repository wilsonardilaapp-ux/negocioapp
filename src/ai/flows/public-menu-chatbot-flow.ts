'use server';

/**
 * @fileOverview Flujo de Genkit para el chatbot del menú público.
 * Reutiliza el motor de IA global y el contexto del negocio/catálogo.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAdminFirestore } from '@/firebase/server-init';

const ChatInputSchema = z.object({
  businessId: z.string(),
  message: z.string(),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).optional(),
});

export async function publicMenuChatbotFlow(input: z.infer<typeof ChatInputSchema>): Promise<string> {
  try {
    const db = await getAdminFirestore();
    
    // 1. Obtener contexto del negocio y catálogo
    const [businessSnap, catalogSnap] = await Promise.all([
      db.collection('businesses').doc(input.businessId).get(),
      db.collection('businesses').doc(input.businessId).collection('publicData').doc('catalog').get()
    ]);

    const businessData = businessSnap.exists ? businessSnap.data() : {};
    const catalogData = catalogSnap.exists ? catalogSnap.data() : { products: [] };

    // 2. Construir el prompt de sistema con el contexto real
    const systemPrompt = `
      Eres el asistente virtual oficial del negocio ${businessData?.name || 'este establecimiento'}.
      
      INFORMACIÓN DEL NEGOCIO:
      - Nombre: ${businessData?.name}
      - Descripción: ${businessData?.description}
      - Dirección: ${businessData?.address}
      - Teléfono: ${businessData?.phone}
      
      CATÁLOGO DE PRODUCTOS Y PRECIOS:
      ${JSON.stringify(catalogData?.products || [])}

      REGLAS DE RESPUESTA:
      1. Responde únicamente con la información proporcionada arriba.
      2. No inventes precios, promociones ni productos que no estén en la lista.
      3. Si no tienes la información solicitada, indica amablemente que el cliente puede contactar al negocio directamente al ${businessData?.phone}.
      4. Sé cortés y profesional.
    `;

    // 3. Generar respuesta usando el motor global
    const response = await ai.generate({
      model: 'googleai/gemini-1.5-flash', // O el modelo activo por defecto
      system: systemPrompt,
      prompt: input.message,
      config: {
        temperature: 0.3,
      }
    });

    return response.text || "Lo siento, no puedo procesar tu solicitud en este momento.";

  } catch (error) {
    console.error('[PublicMenuChatbotFlow] Error:', error);
    return "Lo siento, hubo un error técnico. Por favor, intenta más tarde o contacta al negocio.";
  }
}
