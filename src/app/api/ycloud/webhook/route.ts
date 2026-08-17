import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminFirestore } from '@/firebase/server-init';
import { chat } from '@/ai/flows/chat-flow';
import { v4 as uuidv4 } from 'uuid';

/**
 * @fileOverview Webhook dedicado para YCloud WhatsApp API v2.
 * Realiza validación de firma y resolución de inquilino (Tenant Resolution).
 */

function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!secret) return true; // Si no hay secreto configurado, omitimos validación
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return digest === signature;
}

function normalizePhoneNumber(phone: string | undefined | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

export async function GET() {
  return NextResponse.json({ status: 'online', provider: 'ycloud' }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('X-YCloud-Signature') || '';
  
  try {
    const body = JSON.parse(rawBody);
    console.log('[YCLOUD-WEBHOOK] Evento recibido:', body.type);

    // Solo procesamos mensajes entrantes
    if (body.type !== 'whatsapp.inbound_message.received') {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const inbound = body.whatsappInboundMessage;
    const wabaId = inbound.wabaId;
    const from = inbound.from; // Número del cliente
    const text = inbound.text?.body || '';

    if (!wabaId || !text) {
      return NextResponse.json({ status: 'error', message: 'missing_data' }, { status: 200 });
    }

    const db = await getAdminFirestore();

    // 1. Resolución de Inquilino por WABA ID
    const configSnapshot = await db.collectionGroup('chatbotConfig')
      .where('yCloud.wabaId', '==', wabaId)
      .limit(1)
      .get();

    if (configSnapshot.empty) {
      console.warn(`[YCLOUD-WEBHOOK] Negocio no identificado para WABA: ${wabaId}`);
      return NextResponse.json({ status: 'error', reason: 'business_not_found' }, { status: 200 });
    }

    const configDoc = configSnapshot.docs[0];
    const configData = configDoc.data();
    
    // Obtener businessId del path o del campo
    const businessId = configData.businessId || configDoc.ref.parent.parent?.id;
    const yCloudConfig = configData.yCloud;

    if (!businessId || !yCloudConfig?.apiKey) {
      return NextResponse.json({ status: 'error', reason: 'incomplete_config' }, { status: 200 });
    }

    // 2. Validación de Firma (si hay secreto)
    if (yCloudConfig.webhookSecret && !verifySignature(rawBody, signature, yCloudConfig.webhookSecret)) {
      return NextResponse.json({ status: 'error', reason: 'invalid_signature' }, { status: 401 });
    }

    // 3. Procesamiento Asíncrono (Chat Flow)
    const processMessage = async () => {
      try {
        const conversationId = uuidv4();
        const sender = normalizePhoneNumber(from);

        // Registro de conversación
        await db.collection('businesses')
          .doc(businessId)
          .collection('chatConversations')
          .doc(conversationId)
          .set({
            businessId,
            userIdentifier: sender,
            startTime: new Date().toISOString(),
            status: 'active',
            channel: 'whatsapp_ycloud',
          });

        // Obtener respuesta de IA
        const aiResponse = await chat({
          businessId,
          message: text,
          history: []
        });

        // Enviar respuesta vía YCloud
        const yCloudUrl = 'https://api.ycloud.com/v2/whatsapp/messages';
        await fetch(yCloudUrl, {
          method: 'POST',
          headers: {
            'X-API-Key': yCloudConfig.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: yCloudConfig.phoneNumber,
            to: sender,
            type: 'text',
            text: { body: aiResponse }
          })
        });

      } catch (e: any) {
        console.error(`[YCLOUD-WEBHOOK] Error procesando respuesta:`, e.message);
      }
    };

    // No bloqueamos la respuesta del webhook
    processMessage();

    return NextResponse.json({ status: 'received' }, { status: 200 });

  } catch (error: any) {
    console.error(`[YCLOUD-WEBHOOK] Error fatal:`, error.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
