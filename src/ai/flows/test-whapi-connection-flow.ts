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
  async ({ apiKey, instanceId }) => {
    try {
      const whapiUrl = `https://gate.whapi.cloud/instances/${instanceId}/status`;
      
      const response = await fetch(whapiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        let detail = 'Error desconocido';
        try {
            const errorBody = await response.text();
            if (errorBody) {
                try {
                    const errorJson = JSON.parse(errorBody);
                    // Extracción agresiva para evitar [object Object]
                    const extracted = errorJson.error?.message || errorJson.message || errorJson.error || errorBody;
                    detail = typeof extracted === 'object' ? JSON.stringify(extracted) : String(extracted);
                } catch (jsonError) {
                    detail = errorBody;
                }
            }
        } catch (readError) {
            detail = `HTTP ${response.status}`;
        }

        if (detail.toLowerCase().includes('not found')) {
            throw new Error('Instancia/Canal no encontrado (404). Por favor, verifica tu "Instance ID" y "API Key".');
        }
        
        throw new Error(`Detalle: ${detail}`);
      }

      const data = await response.json();

      if (data?.account_status === 'authenticated') {
        return { success: true, message: `¡Conexión exitosa! Estado: ${data.account_status}.` };
      } else {
        throw new Error(`Estado de la cuenta: ${data.account_status || 'no autenticado'}.`);
      }

    } catch (error: any) {
      console.error(`[WHAPI Test Error] Instance: ${instanceId}:`, error);
      
      const errorMsg = error.message || 'Error desconocido';
      
      if (errorMsg.includes('fetch failed') || errorMsg.includes('ENOTFOUND')) {
         return { success: false, message: `Error de RED: El servidor no pudo contactar a WHAPI.` };
      }
      
      return { success: false, message: `Error de conexión: ${errorMsg}` };
    }
  }
);
