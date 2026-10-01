'use server';

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'zod';
import { genkit } from 'genkit';

const TestApiKeyInputSchema = z.object({
  provider: z.string().min(1),
  apiKey: z.string().min(1, 'API Key is required.'),
  endpoint: z.string().optional(),
  model: z.string().optional(),
  providerName: z.string().optional(),
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
      let providerName = input.providerName || provider;

      // CASO 1: Google AI o NanoBanana
      if (provider === 'google' || provider === 'nanobanana') {
          providerName = provider === 'google' ? 'Google AI' : 'NanoBanana';
          const testAi = genkit({ plugins: [googleAI({ apiKey })] });
          const { text: googleText } = await testAi.generate({ 
            model: 'googleai/gemini-3.6-flash', 
            prompt: 'Hi', 
            config: { temperature: 0 } 
          });
          if (googleText) {
            return { success: true, message: `Conexión exitosa con ${providerName}.` };
          } else {
            throw new Error(`No se recibió texto de ${providerName}.`);
          }
      }

      // CASO 2: Jev IA / TypeSafe (Verificación oficial mediante GET /v1/models)
      const rawEndpoint = (input.endpoint || '').trim();
      const isTypeSafeOrJev = provider === 'jevia' || 
                              rawEndpoint.includes('typesafe.ai') || 
                              (input.providerName || '').toLowerCase().includes('jev');

      if (isTypeSafeOrJev) {
          let modelsUrl = rawEndpoint || 'https://api.typesafe.ai/v1';
          modelsUrl = modelsUrl.replace(/\/+$/, '');
          if (!modelsUrl.endsWith('/models')) {
            if (modelsUrl.endsWith('/v1')) {
              modelsUrl = `${modelsUrl}/models`;
            } else {
              modelsUrl = `${modelsUrl}/v1/models`;
            }
          }

          const response = await fetch(modelsUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`${providerName} API Error (${response.status}): ${errorText}`);
          }

          const data = await response.json();
          const modelList = data.models && Array.isArray(data.models) 
            ? data.models.map((m: any) => m.name).join(', ') 
            : (input.model || 'jev-latest');

          return {
            success: true,
            message: `¡Conexión exitosa con ${providerName}! Modelo verificado: ${modelList}.`
          };
      }

      // CASO 3: Proveedores compatibles con OpenAI (OpenAI, Groq, DeepSeek, Qwen, etc.)
      let endpoint = '';
      let model = input.model || 'gpt-4o-mini';

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
        endpoint = 'https://api.z-ai.io/v1/chat/completions';
        providerName = 'z.ai';
        model = 'zai-v1';
      } else {
        if (!input.endpoint) throw new Error('Endpoint requerido para este proveedor de IA.');
        endpoint = input.endpoint.trim().replace(/\/+$/, '');
        if (!endpoint.endsWith('/chat/completions')) {
          endpoint = endpoint.endsWith('/v1') ? `${endpoint}/chat/completions` : `${endpoint}/v1/chat/completions`;
        }
        providerName = input.providerName || (provider === 'custom' ? 'Custom API' : provider);
      }

      // Probar POST /chat/completions
      let response = await fetch(endpoint, {
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

      // Si da 404, fallback automático con GET /models
      if (response.status === 404 && endpoint.includes('/chat/completions')) {
        const fallbackModelsUrl = endpoint.replace('/chat/completions', '/models');
        const fallbackRes = await fetch(fallbackModelsUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });
        if (fallbackRes.ok) {
          return { success: true, message: `¡Conexión exitosa con ${providerName}!` };
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${providerName} API Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        return { success: true, message: `¡Conexión exitosa con ${providerName}!` };
      } else {
        throw new Error(`Respuesta vacía de ${providerName}.`);
      }

    } catch (error: any) {
      console.error(`Error detallado al probar ${provider}:`, error);
      let errorMsg = error.message || 'Error desconocido';

      if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
        return { success: false, message: 'Clave inválida (401). Verifica tus credenciales de la API.' };
      } 
      if (errorMsg.includes('fetch failed')) {
        return { success: false, message: `Error de RED: No se pudo contactar al servidor de ${input.providerName || provider}.` };
      }

      return { success: false, message: `Error de conexión: ${errorMsg}` };
    }
  }
);
