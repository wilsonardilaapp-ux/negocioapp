
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
        let errorMessage = `La API de WHAPI devolvió un error ${response.status}.`;
        try {
            // Attempt to get more details from the response body by reading it as text first
            const errorBody = await response.text();
            if (errorBody) {
                try {
                    // Try to parse the text as JSON
                    const errorJson = JSON.parse(errorBody);
                    if (errorJson.error === 'Channel not found') {
                        errorMessage = 'Instancia/Canal no encontrado (404). Por favor, verifica que tu "Instance ID" y "API Key" sean correctos.';
                    } else if (errorJson.error) {
                        errorMessage = `Error de WHAPI: ${errorJson.error}`;
                    } else {
                        // It's JSON but not the expected format, show the raw JSON
                        errorMessage += ` Respuesta: ${errorBody}`;
                    }
                } catch (jsonError) {
                    // If parsing as JSON fails, it's likely plain text.
                    errorMessage += ` Detalles: ${errorBody}`;
                }
            }
        } catch (readError) {
            // If reading the body fails, we stick with the original generic message.
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data?.account_status === 'authenticated') {
        return { success: true, message: `¡Conexión exitosa! Estado de la cuenta: ${data.account_status}.` };
      } else {
        throw new Error(`Conexión fallida. Estado de la cuenta: ${data.account_status || 'desconocido'}.`);
      }

    } catch (error: any) {
      console.error(`Error detallado al probar WHAPI:`, error);
      
      const errorMsg = error.message || 'Error desconocido';
      
      if (errorMsg.includes('fetch failed') || errorMsg.includes('ENOTFOUND')) {
         return { success: false, message: `Error de RED: El servidor no pudo contactar la API de WHAPI.` };
      }
      
      return { success: false, message: `Error de conexión: ${errorMsg}` };
    }
  }
);
