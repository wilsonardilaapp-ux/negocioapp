import { IWhatsAppProvider, WhatsAppResponse } from './whatsapp-provider.interface';

/**
 * @fileOverview Proveedor de WhatsApp para la API de WHAPI.cloud.
 */
export class WhapiProvider implements IWhatsAppProvider {
  private readonly baseUrl = 'https://gate.whapi.cloud/messages/text';

  constructor(private readonly token: string) {}

  async sendMessage(to: string, text: string): Promise<WhatsAppResponse> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          to: to.includes('@') ? to : `${to}@s.whatsapp.net`,
          body: text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Captura amigable del error 401 (Canal no autorizado o desconectado)
        if (response.status === 401 || errorText.toLowerCase().includes('need channel authorization')) {
          return { 
            success: false, 
            error: "Tu canal de WhatsApp no está vinculado o la sesión expiró. Por favor, escanea el código QR en la configuración del Asistente WHAPI." 
          };
        }

        return { success: false, error: `WHAPI Error: ${response.status} - ${errorText}` };
      }

      const data = await response.json();
      return { success: true, messageId: data.id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }
}
