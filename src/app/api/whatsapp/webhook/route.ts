import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/server-init';
import { chat } from '@/ai/flows/chat-flow';
import { v4 as uuidv4 } from "uuid";

/**
 * Normaliza un número de teléfono eliminando sufijos de red y devolviendo últimos 10 dígitos.
 */
function normalizePhoneNumber(phone: string | undefined | null): string {
  if (!phone) return '';
  const cleanBase = phone.split('@')[0];
  const digits = cleanBase.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export async function GET() {
    return NextResponse.json({ 
        status: 'online', 
        message: 'Webhook de Markix activo y esperando eventos POST.' 
    }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  console.log('[WHAPI-WEBHOOK] Payload entrante:', JSON.stringify(body));

  try {
    const message = body.messages?.[0];
    const channelId = body.channel_id?.toString().trim().toUpperCase(); 
    
    if (!message || message.from_me) {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    if (!channelId) {
      console.error('[WHAPI-WEBHOOK] [ERROR] No se recibió channel_id en el payload.');
      return NextResponse.json({ status: 'error', message: 'missing_channel_id' }, { status: 200 });
    }

    const incomingText = message.text?.body || message.caption || '';
    const incomingChatId = message.chat_id || message.from;

    if (!incomingText) {
      console.log('[WHAPI-WEBHOOK] Mensaje sin texto ignorado.');
      return NextResponse.json({ status: 'ignored', reason: 'no_text' }, { status: 200 });
    }

    console.log(`[WHAPI-WEBHOOK] [PASO 1] Resolviendo negocio para canal: ${channelId}`);
    const db = await getAdminFirestore();
    
    let configSnapshot = await db.collectionGroup('chatbotConfig')
      .where('whapiChannelId', '==', channelId)
      .limit(1)
      .get();

    if (configSnapshot.empty) {
      configSnapshot = await db.collection('businesses')
        .where('whapiChannelId', '==', channelId)
        .limit(1)
        .get();
    }

    if (configSnapshot.empty) {
      console.warn(`[WHAPI-WEBHOOK] [ERROR] Negocio no identificado para el canal: ${channelId}`);
      return NextResponse.json({ status: 'error', reason: 'business_not_found' }, { status: 200 });
    }

    const configDoc = configSnapshot.docs[0];
    const configData = configDoc.data();
    
    const businessId = configData.businessId || (configDoc.ref.parent.id === 'businesses' ? configDoc.id : configDoc.ref.parent.parent?.id) || null;
    const businessToken = configData.whatsApp?.token;

    if (!businessId || !businessToken) {
      console.error(`[WHAPI-WEBHOOK] [ERROR] Configuración incompleta para business ${businessId}. Falta Token.`);
      return NextResponse.json({ status: 'error', reason: 'incomplete_config' }, { status: 200 });
    }

    const processMessage = async () => {
        try {
            const senderNumber = normalizePhoneNumber(incomingChatId);
            const conversationId = uuidv4();
            
            console.log(`[WHAPI-WEBHOOK] [PASO 2] Negocio identificado: ${businessId}. Registrando analítica...`);
            await db.collection('businesses')
              .doc(businessId!)
              .collection('chatConversations')
              .doc(conversationId)
              .set({
                businessId: String(businessId),
                userIdentifier: senderNumber,
                startTime: new Date().toISOString(),
                status: 'active',
                messagesCount: 1, 
                channel: 'whatsapp',
            });

            console.log(`[WHAPI-WEBHOOK] [PASO 4] Iniciando generación de respuesta con IA...`);
            const aiResponse = await chat({
                businessId: businessId!,
                message: incomingText,
                history: [] 
            });

            console.log(`[WHAPI-WEBHOOK] [PASO 4.5] Respuesta generada: ${aiResponse?.substring(0, 100)}...`);
            const finalMessage = aiResponse?.trim() || "Hola, déjanos tu mensaje y te atenderemos pronto.";

            console.log(`[WHAPI-WEBHOOK] [PASO 5] Enviando mensaje a WHAPI a chat_id: ${incomingChatId}`);
            const whapiFetch = await fetch('https://gate.whapi.cloud/messages/text', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${businessToken!.trim()}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to: incomingChatId,
                    body: finalMessage
                })
            });

            console.log(`[WHAPI-WEBHOOK] [PASO 5.5] Respuesta de WHAPI status: ${whapiFetch.status}`);

        } catch (error: any) {
            console.error(`[ERROR-WEBHOOK-PROCESS]:`, error.message);
        }
    };

    // Await obligatorio para asegurar la persistencia del hilo en Vercel antes de cerrar la conexión HTTP
    await processMessage();

    return NextResponse.json({ status: 'received', businessId }, { status: 200 });

  } catch (error: any) {
    console.error(`[WHAPI-WEBHOOK] [ERROR-FATAL]:`, error.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
