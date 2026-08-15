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
  // REGLA 1: LOG ABSOLUTO EN LÍNEA 1
  const body = await req.json().catch(() => ({}));
  console.log('[PAYLOAD-ENTRANTE]', JSON.stringify(body));

  try {
    const message = body.messages?.[0];
    const channelId = body.channel_id?.toString().trim().toUpperCase(); 
    
    // REGLA 2: CERO SILENCIOS EN FILTROS
    if (!message) {
      console.log('[FILTRO-ACTIVADO] Mensaje ignorado por: No existe objeto messages en el payload');
      return NextResponse.json({ status: 'ignored', reason: 'no_message' }, { status: 200 });
    }

    if (message.from_me) {
      console.log('[FILTRO-ACTIVADO] Mensaje ignorado por: Mensaje saliente (from_me: true)');
      return NextResponse.json({ status: 'ignored', reason: 'sent_by_me' }, { status: 200 });
    }

    if (!channelId) {
      console.log('[FILTRO-ACTIVADO] Mensaje ignorado por: Petición sin channel_id');
      return NextResponse.json({ status: 'error', message: 'missing_channel_id' }, { status: 200 });
    }

    // Aceptar múltiples formatos de mensaje (texto plano o subtítulo de media)
    const incomingText = message.text?.body || message.caption || '';
    const incomingChatId = message.chat_id || message.from;

    if (!incomingText) {
      console.log('[FILTRO-ACTIVADO] Mensaje ignorado por: No contiene texto legible');
      return NextResponse.json({ status: 'ignored', reason: 'no_text' }, { status: 200 });
    }

    const db = await getAdminFirestore();
    
    // --- [PASO 1] RESOLUCIÓN DE IDENTIDAD ---
    let businessId: string | null = null;
    let businessToken: string | null = null;

    // Búsqueda multinivel (Fallback)
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
    
    businessId = configData.businessId || configData.business?.businessId || (configDoc.ref.parent.id === 'businesses' ? configDoc.id : configDoc.ref.parent.parent?.id) || null;
    businessToken = configData.whatsApp?.token;

    if (!businessId || !businessToken) {
      console.error(`[WHAPI-WEBHOOK] Configuración incompleta para businessId: ${businessId}`);
      return NextResponse.json({ status: 'error', reason: 'incomplete_config' }, { status: 200 });
    }

    console.log(`[WHAPI-SUCCESS] Negocio identificado: ${businessId}`);

    // REGLA 3: BYPASS DE PRUEBA (FORZAR ENVÍO)
    // Probamos la conexión de salida inmediatamente
    try {
        const testResponse = await fetch('https://gate.whapi.cloud/messages/text', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${businessToken.trim()}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                to: incomingChatId, 
                body: '¡Sistema conectado! El webhook ya puede enviar mensajes.' 
            })
        });
        console.log('[PRUEBA-FORZADA] Resultado:', testResponse.status);
    } catch (testError: any) {
        console.error('[PRUEBA-FORZADA-ERROR] Fallo crítico de red:', testError.message);
    }

    // --- [EJECUCIÓN ASÍNCRONA DE LA IA] ---
    (async () => {
        const fallbackMessage = 'Hola, soy el asistente del Salón de Belleza Natural. Estoy teniendo un problema técnico momentáneo para leer mis manuales. Por favor, deja tu duda y un humano te atenderá pronto.';
        let responseSent = false;

        try {
            // Monitor de Timeout (8 segundos)
            const timeoutMonitor = setTimeout(async () => {
                if (!responseSent) {
                    console.log(`[TIMEOUT-ALERTA] Generación lenta para ${businessId}. Enviando aviso...`);
                    await fetch('https://gate.whapi.cloud/messages/text', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${businessToken?.trim()}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ to: incomingChatId, body: 'Estamos procesando tu solicitud, un momento por favor...' })
                    }).catch(() => {});
                }
            }, 8000);

            console.log(`[PASO 2] Registrando Analíticas...`);
            const senderNumber = normalizePhoneNumber(incomingChatId);
            const conversationId = uuidv4();
            await db.collection('businesses').doc(businessId!).collection('chatConversations').doc(conversationId).set({
                businessId: String(businessId),
                userIdentifier: senderNumber,
                startTime: new Date().toISOString(),
                status: 'active',
                messagesCount: 1, 
                channel: 'whatsapp',
            }).catch(e => console.error("[ANALYTICS-ERROR]", e.message));

            console.log(`[PASO 3] Llamando a IA...`);
            const aiResponse = await chat({
                businessId: businessId!,
                message: incomingText,
                history: [] 
            });

            clearTimeout(timeoutMonitor);
            const finalMessage = aiResponse?.trim() || fallbackMessage;

            console.log(`[PASO 4] Enviando Respuesta Final a Whapi...`);
            const whapiResponse = await fetch('https://gate.whapi.cloud/messages/text', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${businessToken!.trim()}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    to: incomingChatId,
                    body: finalMessage
                })
            });

            responseSent = true;

            if (!whapiResponse.ok) {
                const errorBody = await whapiResponse.text();
                console.error(`[WHAPI-FATAL] Fallo al enviar respuesta final. Status: ${whapiResponse.status}. Body: ${errorBody}`);
            } else {
                console.log(`[WHAPI-SUCCESS] Respuesta final entregada correctamente.`);
            }

        } catch (error: any) {
            console.error(`[WHAPI-NETWORK-ERROR] Error crítico en el proceso asíncrono:`, error.message);
            
            // Envío forzado de fallback en caso de error catastrófico
            if (!responseSent) {
                await fetch('https://gate.whapi.cloud/messages/text', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${businessToken!.trim()}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ to: incomingChatId, body: fallbackMessage })
                }).catch(() => {});
            }
        }
    })();

    return NextResponse.json({ status: 'received', businessId }, { status: 200 });

  } catch (error: any) {
    console.error(`[WHAPI-WEBHOOK-FATAL]:`, error.message);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
