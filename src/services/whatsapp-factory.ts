import { getAdminFirestore } from '@/firebase/server-init';
import { WhapiProvider } from './providers/whapi-provider';
import { YCloudProvider } from './providers/ycloud-provider';
import type { IWhatsAppProvider } from './providers/whatsapp-provider.interface';
import type { ChatbotConfig } from '@/models/chatbot-config';

/**
 * @fileOverview Factory para resolver el proveedor de WhatsApp según la configuración del negocio.
 */
export class WhatsAppFactory {
  /**
   * Resuelve el proveedor adecuado para un negocio específico.
   */
  static async getProvider(businessId: string): Promise<IWhatsAppProvider | null> {
    try {
      const db = await getAdminFirestore();
      const configSnap = await db.doc(`businesses/${businessId}/chatbotConfig/main`).get();
      
      if (!configSnap.exists) {
        return null;
      }

      const config = configSnap.data() as ChatbotConfig;
      
      // 1. Prioridad YCloud si está configurado y seleccionado
      if (config.provider === 'ycloud' && config.yCloud?.apiKey) {
        return new YCloudProvider(config.yCloud.apiKey, config.yCloud.phoneNumber);
      }
      
      // 2. Fallback a WHAPI (el actual predeterminado)
      if (config.whatsApp?.token) {
        return new WhapiProvider(config.whatsApp.token);
      }

      return null;
    } catch (error) {
      console.error("[WhatsAppFactory] Error resolving provider:", error);
      return null;
    }
  }
}
