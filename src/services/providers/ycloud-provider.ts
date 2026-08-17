import { IWhatsAppProvider, WhatsAppResponse } from './whatsapp-provider.interface';

/**
 * @fileOverview Proveedor de WhatsApp para la API v2 de YCloud.
 */
export class YCloudProvider implements IWhatsAppProvider {
  private readonly baseUrl = 'https://api.ycloud.com/v2/whatsapp/messages';

  constructor(
    private readonly apiKey: string,
    private readonly from: string
  ) {}

  async sendMessage(to: string, text: string): Promise<WhatsAppResponse> {
    try {
      // YCloud espera el número sin @s.whatsapp.net y con formato internacional
      const cleanTo = to.split('@')[0].replace(/\D/g, '');

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: cleanTo,
          type: 'text',
          text: {
            body: text
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { 
          success: false, 
          error: `YCloud Error: ${response.status} - ${errorData.message || 'Unknown error'}` 
        };
      }

      const data = await response.json();
      return { success: true, messageId: data.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
