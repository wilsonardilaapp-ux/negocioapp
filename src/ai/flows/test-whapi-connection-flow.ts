'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const TestWhapiConnectionInputSchema = z.object({
  apiKey: z.string().min(1, 'API Key is required.'),
  instanceId: z.string().min(1, 'Instance ID is required.'),
});
export type TestWhapiConnectionInput = z.infer<typeof TestWhapiConnectionInputSchema>;

export async function testWhapiConnection(input: TestWhapiConnectionInput): Promise<{ success: boolean; message: string }> {
  return testWhapiConnectionFlow(input);
}

const testWhapiConnectionFlow = ai.defineFlow(
  {
    name: 'testWhapiConnectionFlow',
    inputSchema: TestWhapiConnectionInputSchema,
    outputSchema: z.object({ success: z.boolean(), message: z.string() }),
  },
  async ({ apiKey }) => {
    try {
      // Endpoint global de WHAPI para validar el Token sin depender del ID de instancia (evita Error 404)
      const whapiUrl = `https://gate.whapi.cloud/health`;
      
      const response = await fetch(whapiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
      });

      if (!response.ok) {
        let detail = `Error HTTP ${response.status}`;
        try {
            const errorBody = await response.text();
            if (errorBody) {
                try {
                    const errorJson = JSON.parse(errorBody);
                    // Extracción profunda del mensaje de error para evitar [object Object]
                    const rawError = errorJson.error?.message || errorJson.message || errorJson.error || errorBody;
                    detail = typeof rawError === 'object' ? JSON.stringify(rawError) : String(rawError);
                } catch (jsonError) {
                    detail = errorBody;
                }
            }
        } catch (readError) {
            // ignore
        }

        if (response.status === 401) {
            throw new Error(`Token no autorizado (401): ${detail}.`);
        }
        
        throw new Error(detail);
      }

      const data = await response.json();

      // Si el endpoint /health responde 200 OK con el token, la conexión es exitosa
      return { 
        success: true, 
        message: `¡Conexión exitosa! El token es válido y está vinculado a la cuenta: ${data.account?.email || 'Principal'}.` 
      };

    } catch (error: any) {
      console.error(`[WHAPI-TOKEN-TEST-ERROR]:`, error);
      const errorMsg = error.message || 'Error de conexión desconocido.';
      return { success: false, message: errorMsg };
    }
  }
);
