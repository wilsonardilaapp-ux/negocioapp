'use server';

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'zod';
import { genkit } from 'genkit';

const TestApiKeyInputSchema = z.object({
  provider: z.enum(['google', 'openai', 'groq']),
  apiKey: z.string().min(1, 'API Key is required.'),
});
export type TestApiKeyInput = z.infer<typeof TestApiKeyInputSchema>;

export async function testApiKey(input: TestApiKeyInput): Promise<{ success: boolean; message: string }> {
  return testApiKeyFlow(input);
}

const testApiKeyFlow = ai.defineFlow(
  {
    name: 'testApiKeyFlow',
    inputSchema: TestApiKeyInputSchema,
    outputSchema: z.object({ success: z.boolean(), message: z.string() }),
  },
  async ({ provider, apiKey }) => {
    try {
      let success = false;
      let message = '';
      let providerName = '';

      switch (provider) {
        case 'google':
          providerName = 'Google AI';
          const testAi = genkit({ plugins: [googleAI({ apiKey })] });
          const { text: googleText } = await testAi.generate({ model: 'gemini-1.5-flash', prompt: 'Hi', config: { temperature: 0 } });
          if (googleText) {
            success = true;
            message = `Conexión exitosa con ${providerName}.`;
          } else {
            throw new Error(`No se recibió texto de ${providerName}.`);
          }
          break;
        
        case 'openai':
          providerName = 'OpenAI';
          const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [{ role: 'user', content: 'Hi' }],
              model: 'gpt-4o-mini',
              max_tokens: 5,
            }),
          });
          
          if (!openAIResponse.ok) {
             const errorText = await openAIResponse.text();
             throw new Error(`OpenAI API Error (${openAIResponse.status}): ${errorText}`);
          }
          
          const openAIData = await openAIResponse.json();
          if (openAIData.choices && openAIData.choices.length > 0) {
            success = true;
            message = `Conexión exitosa con ${providerName}.`;
          } else {
            throw new Error(`Respuesta vacía de ${providerName}.`);
          }
          break;

        case 'groq':
          providerName = 'Groq';
          const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [{ role: 'user', content: 'Hi' }],
              model: 'llama-3.1-8b-instant', 
            }),
          });

          if (!groqResponse.ok) {
             const errorText = await groqResponse.text();
             throw new Error(`Groq API Error (${groqResponse.status}): ${errorText}`);
          }

          const groqData = await groqResponse.json();
          if (groqData.choices && groqData.choices.length > 0) {
            success = true;
            message = `Conexión exitosa con ${providerName}.`;
          } else {
            throw new Error(`Respuesta vacía de ${providerName}.`);
          }
          break;

        default:
          throw new Error('Proveedor no soportado.');
      }
      
      return { success, message };

    } catch (error: any) {
      console.error(`Error detallado al probar ${provider}:`, error);
      
      let errorMsg = error.message || 'Error desconocido';

      if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
        return { success: false, message: 'Clave inválida (401). Verifica tus credenciales.' };
      } 
      
      if (errorMsg.includes('fetch failed') || errorMsg.includes('ENOTFOUND')) {
         return { success: false, message: `Error de RED: El servidor no pudo contactar a la API. Detalle: ${errorMsg}` };
      }

      return { success: false, message: `Error de conexión: ${errorMsg}` };
    }
  }
);