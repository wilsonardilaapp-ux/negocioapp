import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/server-init';
import { chat } from '@/ai/flows/chat-flow';
import { v4 as uuidv4 } from "uuid";

/**
 * Normaliza un número de teléfono eliminando sufijos de red, espacios, guiones
 * y prefijos de país para una comparación segura.
 */
function normalizePhoneNumber(phone: string | undefined | null): string {
  if (!phone) return '';
  const cleanBase = phone.split('@')[0];
  const digits = cleanBase.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * Endpoint GET para verificación de disponibilidad y conectividad manual.
 */
export async function GET() {
    return NextResponse.json({ 
        status: 'online', 
        message: 'Webhook de Markix activo y esperando eventos POST de WHAPI.',
        timestamp: new Date().toISOString()
    }, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
        body = await req.json();
    } catch (e) {
        console.error('[WHAPI-WEBHOOK] Error parseando JSON entrante');
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    console.log('--- [WHAPI-WEBHOOK INCOMING] ---');
    console.log(JSON.stringify(body, null, 2));

    const message = body.messages?.[0];
    
    // Ignorar si no hay mensaje o si es un mensaje enviado por nosotros
    if (!message || message.from_me) {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const incomingText = message.text?.body;
    const rawSender = message.chat_id || message.from;
    const senderNumber = normalizePhoneNumber(rawSender);

    if (!incomingText) {
      return NextResponse.json({ status: 'ignored', reason: 'no_text_content' }, { status: 200 });
    }

    const db = await getAdminFirestore();
    let businessId: string | null = null;
    let businessToken: string | null = null;

    // Buscar negocio por número normalizado (comparando los últimos 10 dígitos)
    const configSnapshot = await db.collectionGroup('chatbotConfig').get();
    const targetConfigDoc = configSnapshot.docs.find(doc => {
        const data = doc.data();
        const storedNumber = normalizePhoneNumber(data.whatsApp?.number);
        return storedNumber !== '' && storedNumber === senderNumber;
    });

    const urlBusinessId = req.nextUrl.searchParams.get('businessId');
    
    if (urlBusinessId) {
        businessId = urlBusinessId;
    } else if (targetConfigDoc) {
        businessId = targetConfigDoc.data().businessId;
    }

    if (!businessId) {
      console.warn(`[WHAPI-WEBHOOK] Negocio no identificado para: ${senderNumber}`);
      return NextResponse.json({ status: 'error', reason: 'business_not_found' }, { status: 200 });
    }

    const businessConfigSnap = await db.doc(`businesses/${businessId}/chatbotConfig/main`).get();
    businessToken = businessConfigSnap.data()?.whatsApp?.token;

    if (!businessToken) {
      return NextResponse.json({ status: 'error', reason: 'token_missing' }, { status: 200 });
    }

    // Registro en analíticas para persistencia del canal WhatsApp
    try {
      const conversationId = uuidv4();
      await db.collection('businesses').doc(businessId).collection('chatConversations').doc(conversationId).set({
        businessId: String(businessId),
        userIdentifier: senderNumber,
        startTime: new Date().toISOString(),
        status: 'active',
        messagesCount: 1, 
        channel: 'whatsapp',
      });
    } catch (regError) {
      console.error('[WHAPI-WEBHOOK] Error en registro de analíticas:', regError);
    }

    // Procesamiento con IA (Asíncrono para respuesta inmediata 200 OK)
    (async () => {
        try {
            const aiResponse = await chat({
                businessId: businessId!,
                message: incomingText,
                history: []
            });

            await fetch('https://gate.whapi.cloud/messages/text', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${businessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: rawSender,
                    body: aiResponse
                })
            });
        } catch (aiError: any) {
            console.error(`[WHAPI-IA-ERROR] Business: ${businessId}:`, aiError.message);
        }
    })();

    return NextResponse.json({ status: 'received' }, { status: 200 });

  } catch (error: any) {
    console.error(`[WHAPI-WEBHOOK-CRITICAL]:`, error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
