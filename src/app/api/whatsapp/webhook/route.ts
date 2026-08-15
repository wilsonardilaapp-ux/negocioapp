import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/server-init';
import { chat } from '@/ai/flows/chat-flow';
import { v4 as uuidv4 } from "uuid";

/**
 * Normaliza un número de teléfono eliminando sufijos de red, espacios, guiones
 * y devolviendo solo los últimos 10 dígitos para comparación segura.
 */
function normalizePhoneNumber(phone: string | undefined | null): string {
  if (!phone) return '';
  const cleanBase = phone.split('@')[0];
  const digits = cleanBase.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * Endpoint GET para verificación de disponibilidad del Webhook.
 * Útil para pruebas rápidas desde el navegador.
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
    const body = await req.json();
    
    // Log estructurado para depuración en Cloud Logging
    console.log('--- [WHAPI-WEBHOOK INCOMING] ---');
    console.log(JSON.stringify(body, null, 2));

    const message = body.messages?.[0];
    
    // Ignorar eventos que no sean mensajes o mensajes salientes
    if (!message || message.from_me) {
      return NextResponse.json({ status: 'ignored', reason: 'not_a_customer_message' }, { status: 200 });
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

    // 1. Resolución de Identidad: Buscar el negocio dueño de este número
    const configSnapshot = await db.collectionGroup('chatbotConfig').get();
    const targetConfigDoc = configSnapshot.docs.find(doc => {
        const data = doc.data();
        const storedNumber = normalizePhoneNumber(data.whatsApp?.number);
        return storedNumber !== '' && storedNumber === senderNumber;
    });

    // 2. Prioridad de identificación: Parámetro URL > Documento encontrado (Data) > Documento encontrado (Path)
    const urlBusinessId = req.nextUrl.searchParams.get('businessId');
    
    if (urlBusinessId) {
        businessId = urlBusinessId;
    } else if (targetConfigDoc) {
        // Fallback: Si el documento no tiene el campo businessId, lo extraemos de su ruta (businesses/ID/chatbotConfig/main)
        businessId = targetConfigDoc.data().businessId || targetConfigDoc.ref.parent.parent?.id || null;
    }

    if (!businessId) {
      console.warn(`[WHAPI-WEBHOOK] Negocio no identificado para el remitente: ${senderNumber}`);
      return NextResponse.json({ status: 'error', reason: 'business_not_found' }, { status: 200 });
    }

    // 3. Obtener credenciales de envío del negocio
    const businessConfigSnap = await db.doc(`businesses/${businessId}/chatbotConfig/main`).get();
    businessToken = businessConfigSnap.data()?.whatsApp?.token;

    if (!businessToken) {
      console.error(`[WHAPI-WEBHOOK] Token faltante para el negocio: ${businessId}`);
      return NextResponse.json({ status: 'error', reason: 'token_missing' }, { status: 200 });
    }

    // 4. Registro en analíticas (Persistencia del canal WhatsApp)
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
      console.error('[WHAPI-WEBHOOK] Fallo al registrar conversación en analíticas:', regError);
    }

    // 5. Procesamiento con IA (Asíncrono para evitar timeouts del webhook)
    (async () => {
        try {
            const aiResponse = await chat({
                businessId: businessId!,
                message: incomingText,
                history: [] // Podrías implementar recuperación de historial aquí
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
            console.error(`[WHAPI-IA-ERROR] Error procesando respuesta para ${businessId}:`, aiError.message);
        }
    })();

    // Siempre retornamos 200 OK inmediatamente a WHAPI
    return NextResponse.json({ status: 'received', businessId }, { status: 200 });

  } catch (error: any) {
    console.error(`[WHAPI-WEBHOOK-CRITICAL]:`, error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
