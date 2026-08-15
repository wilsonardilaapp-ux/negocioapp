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
    
    // Log estructurado para depuración
    console.log('--- [WHAPI-WEBHOOK INCOMING] ---');
    console.log(JSON.stringify(body, null, 2));

    const message = body.messages?.[0];
    
    // 1. Extracción y Normalización Total
    // Normalización: String + Trim + UpperCase para evitar fallos de comparación
    const channelId = body.channel_id?.toString().trim().toUpperCase(); 
    
    // Ignorar eventos que no sean mensajes o mensajes salientes
    if (!message || message.from_me) {
      return NextResponse.json({ status: 'ignored', reason: 'not_a_customer_message' }, { status: 200 });
    }

    if (!channelId) {
      console.warn('[WHAPI-WEBHOOK] Missing channel_id in payload.');
      return NextResponse.json({ status: 'error', reason: 'missing_channel_id' }, { status: 200 });
    }

    const incomingText = message.text?.body;
    const rawSender = message.chat_id || message.from;

    if (!incomingText) {
      return NextResponse.json({ status: 'ignored', reason: 'no_text_content' }, { status: 200 });
    }

    // 2. Log de Inspección y Consulta
    const db = await getAdminFirestore();
    console.log(`[WHAPI-DEBUG] Iniciando búsqueda en Firestore para channelId: "${channelId}"`);

    let businessId: string | null = null;
    let businessToken: string | null = null;

    // Resolución de Identidad: Búsqueda multinivel (Multi-tenant)
    // Nivel 1: Búsqueda en sub-colecciones chatbotConfig (Estandar)
    let configSnapshot = await db.collectionGroup('chatbotConfig')
      .where('whapiChannelId', '==', channelId)
      .limit(1)
      .get();

    // Nivel 2: Fallback - Búsqueda en colección raíz de negocios
    if (configSnapshot.empty) {
      console.log(`[WHAPI-DEBUG] No encontrado en collectionGroup. Intentando en 'businesses'...`);
      configSnapshot = await db.collection('businesses')
        .where('whapiChannelId', '==', channelId)
        .limit(1)
        .get();
    }

    if (configSnapshot.empty) {
      // Log detallado para diagnóstico en Vercel
      console.warn(`[WHAPI-WEBHOOK] Negocio no identificado. No existe 'whapiChannelId' con valor "${channelId}" en ninguna sub-colección 'chatbotConfig' ni en raíz de 'businesses'.`);
      return NextResponse.json({ status: 'error', reason: 'business_not_found_for_channel' }, { status: 200 });
    }

    const configDoc = configSnapshot.docs[0];
    const configData = configDoc.data();
    
    // 3. Resolución de ID Resiliente
    // Detectamos si el documento encontrado es un negocio raíz o una configuración
    if (configDoc.ref.parent.id === 'businesses') {
        businessId = configDoc.id;
    } else {
        businessId = configData.businessId || configData.business?.businessId || configDoc.ref.parent.parent?.id || null;
    }
    
    businessToken = configData.whatsApp?.token;

    // Si encontramos el ID pero no el token (posible en el fallback de raíz), buscamos la config
    if (businessId && !businessToken) {
        const subConfig = await db.collection('businesses').doc(businessId).collection('chatbotConfig').doc('main').get();
        if (subConfig.exists) {
            businessToken = subConfig.data()?.whatsApp?.token;
        }
    }

    if (!businessId || !businessToken) {
      console.error(`[WHAPI-WEBHOOK] Configuración incompleta para el negocio: ${businessId}`);
      return NextResponse.json({ status: 'error', reason: 'token_or_id_missing' }, { status: 200 });
    }

    console.log(`[WHAPI-SUCCESS] Negocio identificado: ${businessId}`);

    // 2. Registro en analíticas (Persistencia del canal WhatsApp en la ruta original)
    try {
      const senderNumber = normalizePhoneNumber(rawSender);
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
      console.error('[WHAPI-WEBHOOK] Fallo al registrar conversación:', regError);
    }

    // 3. Procesamiento asíncrono con IA
    (async () => {
        try {
            console.log(`[AI-DEBUG] Iniciando generación de respuesta para el negocio: ${businessId}`);
            
            const aiResponse = await chat({
                businessId: businessId!,
                message: incomingText,
                history: [] 
            });

            console.log(`[AI-DEBUG] Respuesta generada: "${aiResponse}"`);

            if (!aiResponse || aiResponse.trim() === '') {
                console.warn(`[AI-DEBUG] La IA devolvió una respuesta vacía para el negocio: ${businessId}`);
                return;
            }

            const whapiResponse = await fetch('https://gate.whapi.cloud/messages/text', {
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

            if (!whapiResponse.ok) {
                const errorBody = await whapiResponse.text();
                console.error(`[WHAPI-ERROR] Falló el envío del mensaje a Whapi: ${whapiResponse.status} - ${errorBody}`);
            } else {
                console.log(`[WHAPI-SUCCESS] Respuesta enviada correctamente a ${rawSender}`);
            }

        } catch (aiError: any) {
            console.error(`[WHAPI-IA-ERROR] Error crítico en el procesamiento de respuesta para ${businessId}:`, aiError.message);
            // Capturamos cualquier fallo de Google AI o de la lógica del chat-flow aquí.
        }
    })();

    return NextResponse.json({ status: 'received', businessId }, { status: 200 });

  } catch (error: any) {
    console.error(`[WHAPI-WEBHOOK-CRITICAL]:`, error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}