'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const TestYCloudConnectionInputSchema = z.object({
  apiKey: z.string().min(1, 'API Key is required.'),
  wabaId: z.string().min(1, 'WABA ID is required.'),
});
export type TestYCloudConnectionInput = z.infer<typeof TestYCloudConnectionInputSchema>;

export async function testYCloudConnection(input: TestYCloudConnectionInput): Promise<{ success: boolean; message: string }> {
  return testYCloudConnectionFlow(input);
}

const testYCloudConnectionFlow = ai.defineFlow(
  {
    name: 'testYCloudConnectionFlow',
    inputSchema: TestYCloudConnectionInputSchema,
    outputSchema: z.object({ success: z.boolean(), message: z.string() }),
  },
  async ({ apiKey, wabaId }) => {
    try {
      // Usamos el endpoint de WhatsApp Accounts para validar la llave y el acceso al WABA
      const url = `https://api.ycloud.com/v2/whatsapp/whatsappAccounts/${wabaId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-API-Key': apiKey.trim(),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        throw new Error(errorData.message || 'Error de autenticación con YCloud.');
      }

      const data = await response.json();

      return { 
        success: true, 
        message: `¡Conexión exitosa! El WABA "${data.name || wabaId}" está correctamente vinculado y la API Key es válida.` 
      };

    } catch (error: any) {
      console.error(`[YCLOUD-TEST-ERROR]:`, error);
      return { success: false, message: error.message || 'Error de conexión desconocido.' };
    }
  }
);
