'use server';

/**
 * @fileOverview Servicio de recuperación de clientes insatisfechos.
 * Utiliza IA para generar mensajes de disculpa personalizados y los envía vía WhatsApp.
 */

import { getAdminFirestore } from '../firebase/server-init';
import { generateSimpleText } from '../ai/flows/simple-text-flow';
import { getAIConfig } from '../ai/flows/chat-flow';
import { FieldValue } from 'firebase-admin/firestore';

interface RecoveryParams {
  businessId: string;
  name: string;
  whatsapp: string;
  rating: number;
  comment: string;
  reviewId?: string;
}

/**
 * Orquesta el proceso de recuperación de un cliente tras una reseña negativa.
 * Se ejecuta de forma asíncrona para no bloquear el flujo de respuesta al cliente.
 */
export async function handleNegativeReviewRecovery(params: RecoveryParams): Promise<void> {
  const { businessId, name, whatsapp, rating, comment, reviewId } = params;

  try {
    const db = await getAdminFirestore();

    // 1. Obtener datos del negocio para personalización y configuración de WhatsApp
    const [businessSnap, chatbotConfigSnap] = await Promise.all([
      db.collection('businesses').doc(businessId).get(),
      db.doc(`businesses/${businessId}/chatbotConfig/main`).get()
    ]);

    if (!businessSnap.exists) {
      console.error(`[RecoveryService] Business ${businessId} not found`);
      return;
    }

    const businessData = businessSnap.data();
    const businessName = businessData?.name || 'Nuestro Negocio';
    const whatsappToken = chatbotConfigSnap.data()?.whatsApp?.token;

    // 2. Verificar configuración de IA (Paso obligatorio según flujo solicitado)
    const aiConfig = await getAIConfig(businessId);
    if (!aiConfig.apiKey) {
      console.warn(`[RecoveryService] Business ${businessId} has no AI API Key configured. Recovery aborted.`);
      return;
    }

    // 3. Construir el Prompt para la IA
    const prompt = `Actúa como el dueño del negocio. El cliente ${name} dejó una calificación de ${rating}/5 con el comentario: '${comment}'. Escribe un mensaje de WhatsApp corto (máx 250 caracteres), empático, en español, disculpándote y demostrando que su opinión nos importa. No ofrezcas descuentos ni compensaciones económicas. Firma como 'El equipo de ${businessName}'.`;

    // 4. Generar el mensaje con el motor de IA del sistema
    const generatedMessage = await generateSimpleText(prompt);

    // 5. Envío vía WHAPI (solo si el token existe)
    let status: 'sent' | 'failed' = 'failed';
    
    if (whatsappToken) {
      try {
        const response = await fetch('https://gate.whapi.cloud/messages/text', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${whatsappToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: `${whatsapp}@s.whatsapp.net`,
            body: generatedMessage,
          }),
        });

        if (response.ok) {
          status = 'sent';
        } else {
          const errorData = await response.text();
          console.error(`[RecoveryService] WHAPI Error: ${response.status} - ${errorData}`);
        }
      } catch (fetchError) {
        console.error(`[RecoveryService] Network error sending to WHAPI:`, fetchError);
      }
    } else {
      console.warn(`[RecoveryService] WhatsApp token missing for business ${businessId}. Message marked as failed.`);
    }

    // 6. Auditoría y Registro en Firestore
    const auditRef = db.collection('whatsapp_scheduled').doc();
    await auditRef.set({
      businessId,
      whatsapp,
      message: generatedMessage,
      status,
      reason: 'negative_review',
      relatedReviewId: reviewId || null,
      createdAt: FieldValue.serverTimestamp(),
    });

    console.log(`[RecoveryService] Proceso completado para ${name}. Status: ${status}`);

  } catch (error) {
    console.error(`[RecoveryService] Critical error in handleNegativeReviewRecovery:`, error);
  }
}
