import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/server-init';
import { chat } from '@/ai/flows/chat-flow';
import { v4 as uuidv4 } from "uuid";

/**
 * @fileOverview Webhook para WHAPI.cloud corregido.
 * Recibe mensajes entrantes de WhatsApp, identifica al negocio mediante normalización 
 * de números y registra la actividad para analíticas.
 */

// Función de normalización interna para limpieza estricta de números telefónicos
function normalize(phone: string | undefined | null): string {
  if (!phone) return '';
  // Eliminar sufijos de dominio de WhatsApp y caracteres no numéricos
  return phone.split('@')[0].replace(/\D/g, '');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. LOG DE DIAGNÓSTICO: Captura del body completo para auditoría
    console.log('--- [WHAPI-WEBHOOK INCOMING] ---');
    console.log(JSON.stringify(body, null, 2));

    // Validar que sea un evento de mensaje y no una respuesta del propio bot
    const message = body.messages?.[0];
    
    if (!message || message.from_me) {
      return NextResponse.json({ status: 'ignored', reason: 'no_incoming_message_or_from_me' }, { status: 200 });
    }

    const incomingText = message.text?.body;
    const rawSender = message.chat_id || message.from;
    const senderNumber = normalize(rawSender);

    if (!incomingText) {
      return NextResponse.json({ status: 'ignored', reason: 'empty_text' }, { status: 200 });
    }

    console.log(`[WHAPI-WEBHOOK] Procesando mensaje de: ${senderNumber}`);

    // 2. IDENTIFICAR EL NEGOCIO (Resiliente con normalización)
    const db = await getAdminFirestore();
    let businessId: string | null = null;
    let businessToken: string | null = null;

    // Consultar todas las configuraciones de chatbot
    const configSnapshot = await db.collectionGroup('chatbotConfig').get();

    const targetConfigDoc = configSnapshot.docs.find(doc => {
        const data = doc.data();
        const storedNumber = normalize(data.whatsApp?.number);
        // Comparación de números normalizados
        return storedNumber === senderNumber || (storedNumber && senderNumber.endsWith(storedNumber)) || (senderNumber && storedNumber.endsWith(senderNumber));
    });

    // Fallback: Query param en la URL del webhook
    const urlBusinessId = req.nextUrl.searchParams.get('businessId');
    
    if (urlBusinessId) {
        businessId = urlBusinessId;
    } else if (targetConfigDoc) {
        businessId = targetConfigDoc.data().businessId;
    }

    if (!businessId) {
      console.warn(`[WHAPI-WEBHOOK] No se encontró un negocio vinculado para el número normalizado: ${senderNumber}`);
      return NextResponse.json({ status: 'error', reason: 'business_not_found' }, { status: 200 });
    }

    // Obtener configuración extendida del negocio
    const businessConfigSnap = await db.doc(`businesses/${businessId}/chatbotConfig/main`).get();
    const configData = businessConfigSnap.data();
    businessToken = configData?.whatsApp?.token;

    if (!businessToken) {
      console.warn(`[WHAPI-WEBHOOK] El negocio ${businessId} no tiene un token de WHAPI configurado.`);
      return NextResponse.json({ status: 'error', reason: 'token_missing' }, { status: 200 });
    }

    // 3. REGISTRO EN ANALÍTICAS (Mismo patrón que chat-window.tsx)
    try {
      const conversationId = uuidv4();
      const conversationRef = db
        .collection('businesses')
        .doc(businessId)
        .collection('chatConversations')
        .doc(conversationId);

      await conversationRef.set({
        businessId: String(businessId),
        userIdentifier: senderNumber,
        startTime: new Date().toISOString(),
        status: 'active',
        messagesCount: 1, 
        channel: 'whatsapp',
      });
      console.log(`[WHAPI-WEBHOOK] Conversación registrada para analíticas: ${conversationId}`);
    } catch (regError) {
      console.error('[WHAPI-WEBHOOK] Error registrando conversación en analíticas:', regError);
      // No bloqueamos el flujo principal si falla el registro de analítica
    }

    // 4. PROCESAR CON IA (Ejecución asíncrona)
    (async () => {
        try {
            const aiResponse = await chat({
                businessId: businessId!,
                message: incomingText,
                history: []
            });

            // Enviar respuesta vía WHAPI
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
            
            console.log(`[WHAPI-WEBHOOK] Respuesta de IA enviada con éxito a ${senderNumber}`);
        } catch (aiError: any) {
            console.error(`[WHAPI-WEBHOOK] Error procesando IA o enviando respuesta:`, aiError.message);
        }
    })();

    return NextResponse.json({ status: 'received' }, { status: 200 });

  } catch (error: any) {
    console.error(`[WHAPI-WEBHOOK] Error crítico:`, error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
