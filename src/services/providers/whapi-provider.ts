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
        return { success: false, error: `WHAPI Error: ${response.status} - ${errorText}` };
      }

      const data = await response.json();
      return { success: true, messageId: data.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
