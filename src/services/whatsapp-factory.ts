import { getAdminFirestore } from '@/firebase/server-init';
import { WhapiProvider } from './providers/whapi-provider';
import { getAdminFirestore } from '@/firebase/server-init';
import { WhapiProvider } from './providers/whapi-provider';
import { YCloudProvider } from './providers/ycloud-provider';
import type { IWhatsAppProvider } from './providers/whatsapp-provider.interface';
import type { ChatbotConfig, WhatsAppProviderType } from '@/models/chatbot-config';

/**
 * @fileOverview Factory para resolver el proveedor de WhatsApp según la configuración del negocio.
 */
export class WhatsAppFactory {
  /**
   * Resuelve el proveedor adecuado para un negocio específico.
   * Soporta un proveedor explícito para overrides manuales (Fase 10).
   */
  static async getProvider(businessId: string, explicitProvider?: WhatsAppProviderType): Promise<IWhatsAppProvider | null> {
    try {
      const db = await getAdminFirestore();
      const configSnap = await db.doc(`businesses/${businessId}/chatbotConfig/main`).get();
      
      if (!configSnap.exists) {
        return null;
      }

      const config = configSnap.data() as ChatbotConfig;
      
      // Prioridad: 1. Proveedor solicitado explícitamente, 2. Proveedor configurado en DB, 3. Fallback inteligente
      const providerToUse = explicitProvider || config.provider;

      // 1. Resolución de YCloud
      if (providerToUse === 'ycloud' && config.yCloud?.apiKey) {
        return new YCloudProvider(config.yCloud.apiKey, config.yCloud.phoneNumber);
      }
      
      // 2. Resolución de WHAPI (incluye fallback si YCloud falla o no está configurado)
      if ((providerToUse === 'whapi' || !providerToUse) && config.whatsApp?.token) {
        return new WhapiProvider(config.whatsApp.token);
      }

      // 3. Fallback final por disponibilidad de credenciales
      if (config.yCloud?.apiKey) {
        return new YCloudProvider(config.yCloud.apiKey, config.yCloud.phoneNumber);
      }
      
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
