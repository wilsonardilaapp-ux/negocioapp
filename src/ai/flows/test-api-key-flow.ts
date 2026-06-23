
'use server';

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'zod';
import { genkit } from 'genkit';

const TestApiKeyInputSchema = z.object({
  provider: z.enum(['google', 'openai', 'groq', 'nanobanana', 'deepseek', 'qwen', 'zai', 'custom']),
  apiKey: z.string().min(1, 'API Key is required.'),
  endpoint: z.string().optional(),
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
  async (input) => {
    const { provider, apiKey } = input;
    try {
      let success = false;
      let message = '';
      let providerName = '';

      if (provider === 'google' || provider === 'nanobanana') {
          providerName = provider === 'google' ? 'Google AI' : 'NanoBanana';
          const testAi = genkit({ plugins: [googleAI({ apiKey })] });
          const { text: googleText } = await testAi.generate({ 
            model: 'googleai/gemini-1.5-flash', 
            prompt: 'Hi', 
            config: { temperature: 0 } 
          });
          if (googleText) {
            success = true;
            message = `Conexión exitosa con ${providerName}.`;
          } else {
            throw new Error(`No se recibió texto de ${providerName}.`);
          }
      } else {
          // OpenAI Compatible flow
          let endpoint = '';
          let model = 'gpt-4o-mini';

          if (provider === 'openai') {
            endpoint = 'https://api.openai.com/v1/chat/completions';
            providerName = 'OpenAI';
          } else if (provider === 'groq') {
            endpoint = 'https://api.groq.com/openai/v1/chat/completions';
            providerName = 'Groq';
            model = 'llama-3.1-8b-instant';
          } else if (provider === 'deepseek') {
             endpoint = 'https://api.deepseek.com/v1/chat/completions';
             providerName = 'DeepSeek';
             model = 'deepseek-chat';
          } else if (provider === 'qwen') {
             endpoint = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
             providerName = 'Qwen';
             model = 'qwen-plus';
          } else if (provider === 'zai') {
             endpoint = 'https://api.z-ai.io/v1/chat/completions'; // SaaS Internal AI
             providerName = 'z.ai';
             model = 'zai-v1';
          } else if (provider === 'custom') {
             if (!input.endpoint) throw new Error('Endpoint requerido para API personalizada.');
             endpoint = input.endpoint;
             providerName = 'Custom API';
          }

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [{ role: 'user', content: 'Hi' }],
              model: model,
              max_tokens: 5,
            }),
          });
          
          if (!response.ok) {
             const errorText = await response.text();
             throw new Error(`${providerName} API Error (${response.status}): ${errorText}`);
          }
          
          const data = await response.json();
          if (data.choices && data.choices.length > 0) {
            success = true;
            message = `Conexión exitosa con ${providerName}.`;
          } else {
            throw new Error(`Respuesta vacía de ${providerName}.`);
          }
      }
      
      return { success, message };

    } catch (error: any) {
      console.error(`Error detallado al probar ${provider}:`, error);
      
      let errorMsg = error.message || 'Error desconocido';

      if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
        return { success: false, message: 'Clave inválida (401). Verifica tus credenciales.' };
      } 
      
      if (errorMsg.includes('fetch failed')) {
         return { success: false, message: `Error de RED: El servidor no pudo contactar a la API de ${provider}.` };
      }

      return { success: false, message: `Error de conexión: ${errorMsg}` };
    }
  }
);
