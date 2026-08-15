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
  try {
    const body = await req.json();
    const message = body.messages?.[0];
    
    // Normalización estricta del ID del Canal (Tenant ID)
    const channelId = body.channel_id?.toString().trim().toUpperCase(); 
    
    if (!message || message.from_me) {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    if (!channelId) {
      console.warn('[WHAPI-WEBHOOK] Petición recibida sin channel_id.');
      return NextResponse.json({ status: 'error', message: 'missing_channel_id' }, { status: 200 });
    }

    const incomingText = message.text?.body;
    const rawSender = message.chat_id || message.from;

    if (!incomingText) {
      return NextResponse.json({ status: 'ignored' }, { status: 200 });
    }

    const db = await getAdminFirestore();
    
    // 1. Resolución de Identidad (Multi-tenant) con Fallback
    let businessId: string | null = null;
    let businessToken: string | null = null;

    // Nivel 1: Búsqueda en configuraciones de chatbot
    let configSnapshot = await db.collectionGroup('chatbotConfig')
      .where('whapiChannelId', '==', channelId)
      .limit(1)
      .get();

    // Nivel 2: Fallback - Búsqueda en el maestro de negocios
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
    
    // Resolución resiliente del ID de negocio
    businessId = configData.businessId || configData.business?.businessId || (configDoc.ref.parent.id === 'businesses' ? configDoc.id : configDoc.ref.parent.parent?.id) || null;
    businessToken = configData.whatsApp?.token;

    if (!businessId || !businessToken) {
      console.error(`[WHAPI-WEBHOOK] Configuración incompleta para businessId: ${businessId}`);
      return NextResponse.json({ status: 'error', reason: 'incomplete_config' }, { status: 200 });
    }

    console.log(`[WHAPI-SUCCESS] Procesando mensaje para negocio: ${businessId}`);

    // 2. Ejecución asíncrona de IA y respuesta
    (async () => {
        try {
            console.log(`[AI-DEBUG] Iniciando generación de respuesta para: ${businessId}`);
            
            const aiResponse = await chat({
                businessId: businessId!,
                message: incomingText,
                history: [] 
            });

            console.log(`[AI-DEBUG] Respuesta generada: "${aiResponse ? aiResponse.substring(0, 50) : 'VACÍO'}..."`);

            if (!aiResponse) {
              console.warn(`[AI-DEBUG] El motor de IA devolvió una respuesta vacía para ${businessId}.`);
              return;
            }

            const businessTokenPrefix = businessToken ? businessToken.substring(0, 5) : 'MISSING';
            console.log(`[WHAPI-DEBUG] Intentando enviar mensaje con Token: ${businessTokenPrefix}... a chat: ${rawSender}`);

            // Envío utilizando el token específico del negocio identificado con encabezados robustos
            const whapiResponse = await fetch('https://gate.whapi.cloud/messages/text', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${businessToken.trim()}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    to: rawSender,
                    body: aiResponse
                })
            });

            if (!whapiResponse.ok) {
                const errorBody = await whapiResponse.text();
                console.error(`[WHAPI-FATAL] Fallo al enviar. Status: ${whapiResponse.status}. Body: ${errorBody}`);
            } else {
                console.log(`[WHAPI-SUCCESS] Mensaje enviado correctamente al remitente.`);
            }

        } catch (error: any) {
            // Log específico solicitado para fallos de red
            console.error(`[WHAPI-NETWORK-ERROR] Error de red en el proceso asíncrono para ${businessId}:`, error.message);
        }
    })();

    return NextResponse.json({ status: 'received' }, { status: 200 });

  } catch (error: any) {
    console.error(`[WHAPI-WEBHOOK-FATAL]:`, error.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
