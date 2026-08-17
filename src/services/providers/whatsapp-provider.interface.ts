/**
 * @fileOverview Interfaz base para proveedores de mensajería de WhatsApp.
 */

export interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface IWhatsAppProvider {
  /**
   * Envía un mensaje de texto plano al destinatario.
   */
  sendMessage(to: string, text: string): Promise<WhatsAppResponse>;
}
