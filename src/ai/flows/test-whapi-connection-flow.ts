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
      // Usamos el endpoint raíz de la instancia para mayor compatibilidad con instancias FALCON
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
                    // Búsqueda exhaustiva del mensaje de error para evitar [object Object]
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
            throw new Error(`No autorizado (401): ${detail}. Revisa tu API Key.`);
        }
        
        if (response.status === 404) {
            throw new Error(`Instancia no encontrada (404). Revisa tu "Instance ID".`);
        }
        
        throw new Error(detail);
      }

      const data = await response.json();

      // Normalizamos el estado de la cuenta según la versión de la API (FALCON vs Standard)
      const accountStatus = data?.account_status || data?.status?.status;

      if (accountStatus === 'authenticated' || accountStatus === 'connected') {
        return { success: true, message: `¡Conexión exitosa! Estado: ${accountStatus}.` };
      } else {
        return { 
          success: false, 
          message: `Instancia encontrada pero no vinculada. Estado: ${accountStatus || 'desconocido'}. Por favor, escanea el QR en WHAPI.cloud.` 
        };
      }

    } catch (error: any) {
      console.error(`[WHAPI-TEST-ERROR] Instance: ${instanceId}:`, error);
      const errorMsg = error.message || 'Error de conexión desconocido.';
      return { success: false, message: errorMsg };
    }
  }
);
