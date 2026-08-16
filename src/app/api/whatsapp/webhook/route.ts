
import { NextRequest, NextResponse } from 'next/request';
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
  console.log('[PAYLOAD-ENTRANTE]', JSON.stringify(body));

  try {
    const message = body.messages?.[0];
    const channelId = body.channel_id?.toString().trim().toUpperCase(); 
    
    if (!message || message.from_me) {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    if (!channelId) {
      return NextResponse.json({ status: 'error', message: 'missing_channel_id' }, { status: 200 });
    }

    const incomingText = message.text?.body || message.caption || '';
    const incomingChatId = message.chat_id || message.from;

    if (!incomingText) {
      return NextResponse.json({ status: 'ignored', reason: 'no_text' }, { status: 200 });
    }

    const db = await getAdminFirestore();
    
    // --- [PASO 1] RESOLUCIÓN DE IDENTIDAD ---
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
      console.warn(`[WHAPI-WEBHOOK] Negocio no identificado para el canal: ${channelId}`);
      return NextResponse.json({ status: 'error', reason: 'business_not_found' }, { status: 200 });
    }

    const configDoc = configSnapshot.docs[0];
    const configData = configDoc.data();
    
    const businessId = configData.businessId || (configDoc.ref.parent.id === 'businesses' ? configDoc.id : configDoc.ref.parent.parent?.id) || null;
    const businessToken = configData.whatsApp?.token;

    if (!businessId || !businessToken) {
      return NextResponse.json({ status: 'error', reason: 'incomplete_config' }, { status: 200 });
    }

    console.log(`[WHAPI-SUCCESS] Negocio identificado: ${businessId}`);

    /**
     * Proceso principal de IA y envío. 
     * Se utiliza AWAIT para asegurar que la tarea termine antes de que el worker muera.
     */
    const processMessage = async () => {
        try {
            const senderNumber = normalizePhoneNumber(incomingChatId);
            const conversationId = uuidv4();
            
            // Registro de analítica
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

            // Generación IA (Bypasseando RAG)
            const aiResponse = await chat({
                businessId: businessId!,
                message: incomingText,
                history: [] 
            });

            const finalMessage = aiResponse?.trim() || "Hola, déjanos tu mensaje y te atenderemos pronto.";

            // Despacho WHAPI
            await fetch('https://gate.whapi.cloud/messages/text', {
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

        } catch (error: any) {
            console.error(`[ERROR-PROCESO-WEBHOOK]:`, error.message);
        }
    };

    // Await obligatorio para evitar que Vercel mate el proceso a mitad de camino
    await processMessage();

    return NextResponse.json({ status: 'received', businessId }, { status: 200 });

  } catch (error: any) {
    console.error(`[ERROR-WEBHOOK-FATAL]:`, error.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
