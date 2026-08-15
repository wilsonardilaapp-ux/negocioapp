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
      // Usamos el endpoint del recurso directo para mayor compatibilidad entre tipos de instancia (FALCON/Standard)
      const whapiUrl = `https://gate.whapi.cloud/instances/${instanceId}`;
      
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
                    // Extraer mensaje específico del servidor de WHAPI
                    detail = errorJson.error?.message || errorJson.message || errorJson.error || errorBody;
                    // Si el detalle sigue siendo un objeto, convertirlo a string
                    if (typeof detail === 'object') detail = JSON.stringify(detail);
                } catch (jsonError) {
                    detail = errorBody;
                }
            }
        } catch (readError) {
            // ignore
        }

        if (response.status === 401) {
            throw new Error(`No autorizado (401): ${detail}. Verifica que el Token pertenezca a la instancia ${instanceId}.`);
        }
        
        if (response.status === 404 || detail.toLowerCase().includes('not found')) {
            throw new Error(`Instancia no encontrada (404). Verifica tu "Instance ID".`);
        }
        
        throw new Error(detail);
      }

      const data = await response.json();

      // Normalizamos la lectura del estado según la versión de la API
      const accountStatus = data?.account_status || data?.status?.status;

      if (accountStatus === 'authenticated' || accountStatus === 'connected') {
        return { success: true, message: `¡Conexión exitosa! Estado: ${accountStatus}.` };
      } else {
        return { success: false, message: `Instancia encontrada pero no autenticada. Estado: ${accountStatus || 'desconocido'}. Por favor, vincula el QR en el panel de WHAPI.` };
      }

    } catch (error: any) {
      console.error(`[WHAPI Test Error] Instance: ${instanceId}:`, error);
      const errorMsg = error.message || 'Error desconocido';
      return { success: false, message: errorMsg };
    }
  }
);
