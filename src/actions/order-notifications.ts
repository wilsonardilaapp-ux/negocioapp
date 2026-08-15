'use server';

/**
 * @fileOverview Acción de servidor para enviar notificaciones automáticas de pedidos vía WhatsApp.
 * Envía una alerta interna al negocio y una confirmación cordial al cliente.
 */

import { getAdminFirestore } from '../firebase/server-init';
import { normalizePhoneNumber } from '../lib/utils';
import type { Order } from '../models/order';

interface OrderNotificationParams {
  businessId: string;
  orderId: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

/**
 * Orquesta el envío de notificaciones por WhatsApp tras un pedido exitoso.
 * Realiza dos envíos: uno al dueño del negocio y otro al cliente.
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
      return;
    }

    const config = configSnap.data();
    const order = orderSnap.data() as Order;

    const token = config?.whatsApp?.token;
    const businessName = config?.business?.name || 'nuestro negocio';
    
    // Identificación de destinatarios
    const businessPhone = normalizePhoneNumber(config?.whatsApp?.number || '3228831634');
    const customerPhone = normalizePhoneNumber(order.customerPhone);

    if (!token) return;

    // --- PROCESO 1: NOTIFICACIÓN INTERNA PARA EL NEGOCIO ---
    // Mantiene el formato de alerta interna reportado como funcional
    (async () => {
      try {
        const orderShortId = orderId.slice(-7).toUpperCase();
        const itemLines = order.items.map(i => `- ${i.quantity} x ${i.productName}`).join('\n');
        
        const businessMessage = `🛵 *NUEVO PEDIDO RECIBIDO (#${orderShortId})*\n\n` +
          `👤 *Cliente:* ${order.customerName}\n` +
          `📍 *Entrega:* ${order.customerAddress}\n` +
          `📦 *Productos:*\n${itemLines}\n\n` +
          `💰 *Total:* ${formatCurrency(order.total)}\n` +
          `💳 *Pago:* ${order.paymentMethod.replace('_', ' ')}`;

        await fetch('https://gate.whapi.cloud/messages/text', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: `${businessPhone}@s.whatsapp.net`,
            body: businessMessage,
          }),
        });
      } catch (err) {
        console.error(`[OrderNotification] Falló envío interno al negocio ${businessId}`);
      }
    })();

    // --- PROCESO 2: CONFIRMACIÓN PARA EL CLIENTE ---
    // Nuevo envío con tono cercano y resumen simplificado
    if (customerPhone && customerPhone.length >= 10) {
      (async () => {
        try {
          const customerItemLines = order.items.map(i => `- ${i.productName} × ${i.quantity}`).join('\n');
          
          const customerMessage = `¡Hola *${order.customerName}*! 🎉 Tu pedido en *${businessName}* fue recibido.\n\n` +
            `🧾 *Resumen:*\n${customerItemLines}\n\n` +
            `💰 *Total:* ${formatCurrency(order.total)}\n` +
            `💳 *Método de pago:* ${order.paymentMethod.replace('_', ' ')}\n\n` +
            `Te avisaremos cuando esté en camino. ¡Muchas gracias por tu compra! 🚀`;

          await fetch('https://gate.whapi.cloud/messages/text', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: `${customerPhone}@s.whatsapp.net`,
              body: customerMessage,
            }),
          });
        } catch (err) {
          console.error(`[OrderNotification] Falló envío de confirmación al cliente del pedido ${orderId}`);
        }
      })();
    }

  } catch (error: any) {
    console.error(`[OrderNotification] Error crítico en la acción de servidor:`, error.message);
  }
}
