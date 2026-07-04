
import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/server-init';
import { chat } from '@/ai/flows/chat-flow';

/**
 * @fileOverview Webhook para WHAPI.cloud
 * Recibe mensajes entrantes de WhatsApp y los procesa con el motor de IA del SaaS.
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validar que sea un evento de mensaje y no una respuesta del propio bot
    // WHAPI envía un array de mensajes en el campo 'messages'
    const message = body.messages?.[0];
    
    if (!message || message.from_me) {
      return NextResponse.json({ status: 'ignored', reason: 'no_incoming_message' }, { status: 200 });
    }

    // Extraer datos básicos
    const senderNumber = message.chat_id.split('@')[0]; // Número del cliente
    const incomingText = message.text?.body;
    const channelId = body.channel_id; // Este es el Instance ID de WHAPI

    if (!incomingText) {
      return NextResponse.json({ status: 'ignored', reason: 'empty_text' }, { status: 200 });
    }

    console.log(`[WHAPI-WEBHOOK] Mensaje recibido de ${senderNumber} en canal ${channelId}: ${incomingText}`);

    // 2. Identificar el negocio (businessId)
    // Buscamos en Firestore qué negocio tiene configurado este canal o número
    const db = await getAdminFirestore();
    
    // Búsqueda resiliente: intentamos por channelId (Instance ID) o por número normalizado
    let businessId: string | null = null;
    let businessToken: string | null = null;

    // Intentamos buscar por channelId si está disponible en la configuración (Instance ID)
    const configSnapshot = await db.collectionGroup('chatbotConfig')
      .where('whatsApp.number', '>=', '') // Filtro básico para asegurar que buscamos en configs válidas
      .get();

    const targetConfigDoc = configSnapshot.docs.find(doc => {
        const data = doc.data();
        // Mapeo por número (forma más segura actualmente ya que el instanceId no siempre se guarda)
        // O si el usuario pasó el businessId en la URL como query param
        return data.whatsApp?.number?.includes(senderNumber) || 
               data.whatsApp?.number === body.to?.split('@')[0];
    });

    // Fallback: Si el usuario configuró el Webhook con ?businessId=ID_AQUI
    const urlBusinessId = req.nextUrl.searchParams.get('businessId');
    
    if (urlBusinessId) {
        businessId = urlBusinessId;
    } else if (targetConfigDoc) {
        businessId = targetConfigDoc.data().businessId;
    }

    if (!businessId) {
      console.warn(`[WHAPI-WEBHOOK] No se encontró un negocio vinculado para el mensaje de ${senderNumber}`);
      return NextResponse.json({ status: 'error', reason: 'business_not_found' }, { status: 200 });
    }

    // Obtener el token de WHAPI de ese negocio específico
    const businessConfig = await db.doc(`businesses/${businessId}/chatbotConfig/main`).get();
    businessToken = businessConfig.data()?.whatsApp?.token;

    if (!businessToken) {
      console.warn(`[WHAPI-WEBHOOK] El negocio ${businessId} no tiene un token de WHAPI configurado.`);
      return NextResponse.json({ status: 'error', reason: 'token_missing' }, { status: 200 });
    }

    // 3. Procesar con la IA (Llamada asíncrona para no bloquear a WHAPI)
    // WHAPI requiere una respuesta 200 rápida (menos de 2 segundos)
    // Ejecutamos la lógica de IA y envío después de responder a la petición inicial
    (async () => {
        try {
            const aiResponse = await chat({
                businessId: businessId!,
                message: incomingText,
                history: [] // Por ahora sin historial para optimizar velocidad del webhook
            });

            // 4. Enviar respuesta vía WHAPI
            await fetch('https://gate.whapi.cloud/messages/text', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${businessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: message.chat_id,
                    body: aiResponse
                })
            });
            
            console.log(`[WHAPI-WEBHOOK] Respuesta enviada con éxito al cliente ${senderNumber}`);
        } catch (aiError: any) {
            console.error(`[WHAPI-WEBHOOK] Error procesando IA o enviando respuesta:`, aiError.message);
        }
    })();

    // Responder inmediatamente a WHAPI
    return NextResponse.json({ status: 'received' }, { status: 200 });

  } catch (error: any) {
    console.error(`[WHAPI-WEBHOOK] Error crítico:`, error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
