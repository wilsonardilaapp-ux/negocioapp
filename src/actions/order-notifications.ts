'use server';

/**
 * @fileOverview Acción de servidor para enviar notificaciones automáticas de pedidos vía WhatsApp.
 */

import { getAdminFirestore } from '../firebase/server-init';
import { normalizePhoneNumber } from '../lib/utils';

interface OrderNotificationParams {
  businessId: string;
  orderId: string;
}

/**
 * Envía un mensaje de confirmación al cliente cuando realiza un pedido.
 * Diseñado para fallar silenciosamente y no bloquear el flujo principal.
 */
export async function sendOrderConfirmation({ businessId, orderId }: OrderNotificationParams): Promise<void> {
  if (!businessId || !orderId) return;

  try {
    const db = await getAdminFirestore();

    // 1. Obtener configuración de WhatsApp del negocio y datos del pedido en paralelo
    const [configSnap, orderSnap] = await Promise.all([
      db.doc(`businesses/${businessId}/chatbotConfig/main`).get(),
      db.doc(`businesses/${businessId}/orders/${orderId}`).get()
    ]);

    if (!configSnap.exists || !orderSnap.exists) {
      return; // El negocio no tiene configurado el bot o el pedido desapareció
    }

    const config = configSnap.data();
    const order = orderSnap.data();

    const token = config?.whatsApp?.token;
    const channelId = config?.whapiChannelId;
    const rawPhone = order?.customerPhone;
    const businessName = config?.business?.name || 'nuestro negocio';

    // 2. Guardias de seguridad: salir temprano si falta información crítica
    if (!token || !channelId || !rawPhone) {
      return;
    }

    // 3. Normalizar el número del cliente
    const cleanPhone = normalizePhoneNumber(rawPhone);
    if (!cleanPhone || cleanPhone.length < 10) {
      return;
    }

    // 4. Construir el mensaje de confirmación
    const orderShortId = orderId.slice(-7).toUpperCase();
    const message = `¡Hola *${order?.customerName || 'cliente'}*! 👋\n\nConfirmamos que hemos recibido tu pedido *#${orderShortId}* en *${businessName}*.\n\nEstamos procesándolo y te avisaremos ante cualquier novedad. ¡Gracias por tu compra! 🚀`;

    // 5. Envío vía WHAPI API (POST)
    const response = await fetch('https://gate.whapi.cloud/messages/text', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: `${cleanPhone}@s.whatsapp.net`,
        body: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[OrderNotification] WHAPI Error for ${businessId}:`, errorText);
    } else {
      console.log(`[OrderNotification] Confirmación enviada para pedido ${orderShortId}`);
    }

  } catch (error: any) {
    // Requisito 3: Silencio de fallos. Solo logueamos el error para auditoría técnica.
    console.error(`[OrderNotification] Critical error for business ${businessId}:`, error.message);
  }
}
