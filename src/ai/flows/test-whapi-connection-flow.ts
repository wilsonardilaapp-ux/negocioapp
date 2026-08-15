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
                    // Extracción robusta de mensaje para evitar [object Object]
                    detail = errorJson.error?.message || errorJson.message || errorJson.error || errorBody;
                    
                    if (typeof detail === 'object') {
                        detail = JSON.stringify(detail);
                    }
                } catch (jsonError) {
                    detail = errorBody;
                }
            }
        } catch (readError) {
            detail = `HTTP ${response.status}`;
        }

        if (detail === 'Channel not found') {
            throw new Error('Instancia/Canal no encontrado (404). Por favor, verifica que tu "Instance ID" y "API Key" sean correctos.');
        }
        
        throw new Error(`Error de WHAPI: ${detail}`);
      }

      const data = await response.json();

      if (data?.account_status === 'authenticated') {
        return { success: true, message: `¡Conexión exitosa! Estado de la cuenta: ${data.account_status}.` };
      } else {
        throw new Error(`Conexión fallida. Estado de la cuenta: ${data.account_status || 'desconocido'}.`);
      }

    } catch (error: any) {
      console.error(`Error detallado al probar ${instanceId}:`, error);
      
      const errorMsg = error.message || 'Error desconocido';
      
      if (errorMsg.includes('fetch failed') || errorMsg.includes('ENOTFOUND')) {
         return { success: false, message: `Error de RED: El servidor no pudo contactar a la API de WHAPI.` };
      }
      
      return { success: false, message: `Error de conexión: ${errorMsg}` };
    }
  }
);
