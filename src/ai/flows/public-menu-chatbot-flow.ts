'use server';

/**
 * @fileOverview Flujo de Genkit para el chatbot del menú público con ejecución determinista de agendamiento y sugerencias.
 * 
 * - Implementa extracción por etiquetas [BOOKING_DATA: ...] y [INTEREST: ...] para máxima resiliencia.
 * - Capa 0: Resolución de Tenant (Slug a UID) con normalización de tildes.
 * - Capa 3: Implementación de Fallback automático entre proveedores (Google -> DeepSeek).
 * - Capa 5: Extracción robusta con Regex multilínea y validación de campos obligatorios.
 * - Capa 6: Integración proactiva de Cupones y Promociones.
 * - Actualizado a gemini-3.6-flash.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAdminFirestore } from '@/firebase/server-init';
import { 
  PublicMenuChatbotInputSchema, 
  PublicMenuChatbotOutputSchema, 
  PublicMenuChatbotOutput,
} from '@/models/public-menu-chatbot';
import { getAIConfig } from './chat-flow';
import type { BookingService } from '@/models/booking';
import type { Coupon } from '@/models/coupon';
import type { Promotion } from '@/models/promotion';

function calculateEndTimeInternal(startTime: string, duration: number): string {
    const [h, m] = startTime.split(':').map(Number);
    const date = new Date();
    date.setHours(h || 0, (m || 0) + duration, 0);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export const publicMenuChatbotFlow = ai.defineFlow(
  {
    name: 'publicMenuChatbotFlow',
    inputSchema: PublicMenuChatbotInputSchema,
    outputSchema: PublicMenuChatbotOutputSchema,
  },
  async (input): Promise<PublicMenuChatbotOutput> => {
    try {
      let { businessId, question, history = [] } = input;
      const lowQuestion = question.toLowerCase().trim();
      
      const db = await getAdminFirestore();

      // --- CAPA 0: RESOLUCIÓN DE TENANT ---
      let canonicalBusinessId = businessId;
      const directDoc = await db.collection('businesses').doc(businessId).get();
      
      if (!directDoc.exists && businessId !== 'platform-bot') {
        let slugQuery = await db.collection('businesses').where('slug', '==', businessId).limit(1).get();
        if (slugQuery.empty) {
          const cleanSlug = businessId.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
          slugQuery = await db.collection('businesses').where('slug', '==', cleanSlug).limit(1).get();
        }
        if (!slugQuery.empty) {
          canonicalBusinessId = slugQuery.docs[0].id;
        }
      }
      businessId = canonicalBusinessId;
      
      // --- CAPA 1: AUTOMATIZACIÓN LOCAL ---
      try {
        const responsesSnap = await db.collection(`businesses/${businessId}/publicMenuChatbot/main/responses`)
          .where('isActive', '==', true).get();
        const matchedCustom = responsesSnap.docs.find(doc => lowQuestion.includes(doc.data().question?.toLowerCase().trim() || ''));
        if (matchedCustom) return { answer: matchedCustom.data().answer, source: 'custom_response' };
      } catch (e) {}

      // --- CAPA 2: CONOCIMIENTO DEL NEGOCIO (Catálogo, Servicios, Cupones y Promociones) ---
      const todayISO = new Date().toISOString().split('T')[0];
      
      const [businessSnap, catalogSnap, servicesSnap, couponsSnap, promosSnap] = await Promise.all([
          db.collection('businesses').doc(businessId).get(),
          db.collection(`businesses/${businessId}/publicData`).doc('catalog').get(),
          db.collection(`businesses/${businessId}/bookingServices`).where('isActive', '==', true).get(),
          db.collection('cupones').where('businessId', '==', businessId).where('activo', '==', true).get(),
          db.collection('promotions').where('companyId', '==', businessId).where('isActive', '==', true).get()
      ]);

      const bData = businessSnap.data();
      const products = catalogSnap.data()?.products || [];
      const services = servicesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as BookingService));
      
      const coupons = couponsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Coupon))
        .filter(c => c.fechaVencimiento >= todayISO);
      
      const promos = promosSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Promotion))
        .filter(p => p.validUntil >= todayISO);

      const formattedCatalog = products.map((p: any) => `- ${p.name} (ID: ${p.id}): $${p.price}`).join('\n');
      const formattedServices = services.map((s: BookingService) => `- ${s.name}: $${s.price} (${s.durationMinutes} min)`).join('\n');
      
      const formattedCoupons = coupons.map(c => `- Código: ${c.codigo} | Descuento: ${c.tipo === 'porcentaje' ? c.valor + '%' : '$' + c.valor} | Mínimo: $${c.montoMinimo}`).join('\n');
      const formattedPromos = promos.map(p => `- Promo: ${p.title} | ${p.description}`).join('\n');

      // --- CAPA 3: CONFIGURACIÓN IA Y CADENA DE FALLBACK ---
      const aiConfig = await getAIConfig(businessId);
      const googleApiKey = (aiConfig?.apiKey?.startsWith('AIza') ? aiConfig.apiKey : null) || process.env.GEMINI_API_KEY || '';
      
      const integrationDoc = await db.collection('integrations').doc('chatbot-integrado-con-whatsapp-para-soporte-y-ventas').get();
      let deepseekApiKey = process.env.DEEPSEEK_API_KEY || '';
      if (integrationDoc.exists) {
          try {
              const data = integrationDoc.data();
              const fields = typeof data?.fields === 'string' ? JSON.parse(data.fields) : (data?.fields || {});
              if (fields.deepseek?.apiKey) {
                  deepseekApiKey = fields.deepseek.apiKey;
              }
          } catch (e) {}
      }

      const providerChain = [
        { name: 'google', model: 'googleai/gemini-3.6-flash', apiKey: googleApiKey.trim() },
        { name: 'deepseek', model: 'deepseek-chat', apiKey: deepseekApiKey.trim() },
      ].filter(p => p.apiKey);

      if (providerChain.length === 0) {
        return { answer: "Lo siento, no tengo acceso a mi cerebro de IA. Contacta al administrador.", source: 'fallback' };
      }

      const systemPrompt = `Eres el asistente virtual oficial de "${bData?.name || 'Nuestro Negocio'}".

FECHA ACTUAL: ${todayISO}.

SERVICIOS DISPONIBLES:
${formattedServices}

CATÁLOGO DE PRODUCTOS:
${formattedCatalog}

CUPONES DE DESCUENTO ACTIVOS (Solo estos son reales):
${formattedCoupons || 'No hay cupones activos hoy.'}

OFERTAS Y PROMOCIONES ACTUALES:
${formattedPromos || 'No hay ofertas adicionales hoy.'}

REGLAS DE INTERACCIÓN:
1. Si el cliente pregunta por descuentos, ofertas o cupones, responde con la información real de arriba.
2. Si el cliente quiere aplicar un cupón, responde amablemente y agrega al final:
[APPLY_COUPON: "CODIGO"]
3. Si el cliente confirma reserva:
[BOOKING_DATA: {"customerName":"...","customerPhone":"...","serviceName":"...","date":"YYYY-MM-DD","startTime":"HH:mm"}]
4. Si el cliente menciona un producto del catálogo o quiere comprar:
[INTEREST: {"productId": "ID_DEL_PRODUCTO"}]
5. VENTA PROACTIVA: Si el cliente tiene intención de compra, menciona un cupón o promo relevante para ayudarlo a decidir.
6. FORMATO DE RESPUESTA: 
   - Usa **negritas** para resaltar nombres de productos y precios.
   - Usa listas con guiones para desgloses.
   - Usa saltos de línea (\n) para separar conceptos claramente. NUNCA envíes párrafos largos comprimidos si estás listando precios o ahorros.
7. NUNCA inventes códigos ni porcentajes que no estén en la lista.`;

      let rawAnswer = '';
      let lastError = null;

      for (const provider of providerChain) {
        try {
          if (provider.name === 'google') {
            const response = await ai.generate({
              model: provider.model as any,
              system: systemPrompt,
              messages: [
                ...history.map(h => ({ 
                  role: (h.role === 'model' || h.role === 'assistant') ? 'model' as const : 'user' as const,
                  content: [{ text: h.content }] 
                })),
                { role: 'user', content: [{ text: question }] }
              ],
              config: { temperature: 0.1, apiKey: provider.apiKey }
            });
            rawAnswer = response.text;
          } else if (provider.name === 'deepseek') {
            const response = await fetch('https://api.deepseek.com/chat/completions', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${provider.apiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [{ role: 'system', content: systemPrompt }, ...history.map(h => ({ role: (h.role === 'model' || h.role === 'assistant') ? 'assistant' : 'user', content: h.content })), { role: 'user', content: question }],
                temperature: 0.1,
              }),
            });
            const data = await response.json();
            rawAnswer = data.choices?.[0]?.message?.content || "";
          }
          if (rawAnswer) break;
        } catch (err: any) {
          lastError = err;
        }
      }

      if (lastError && !rawAnswer) throw lastError;

      // --- CAPA 5: EXTRACCIÓN ---
      
      // Detección de Cupón
      const couponRegex = /\[APPLY_COUPON:\s*["']?([^"']+)["']?\s*\]/i;
      const couponMatch = rawAnswer.match(couponRegex);
      let detectedCouponCode: string | undefined = undefined;
      if (couponMatch && couponMatch[1]) {
        detectedCouponCode = couponMatch[1].toUpperCase().trim();
        rawAnswer = rawAnswer.replace(couponRegex, '').trim();
      }

      // Detección de Interés
      const interestRegex = /\[INTEREST:\s*(\{[\s\S]*?\})\s*\]/i;
      const interestMatch = rawAnswer.match(interestRegex);
      let detectedProductId: string | undefined = undefined;
      if (interestMatch && interestMatch[1]) {
        try {
          const interestData = JSON.parse(interestMatch[1]);
          detectedProductId = interestData.productId;
          rawAnswer = rawAnswer.replace(interestRegex, '').trim();
        } catch (e) {}
      }

      // Detección de Agendamiento
      const bookingRegex = /\[BOOKING_DATA:\s*(\{[\s\S]*?\})\s*\]/i;
      const bookingMatch = rawAnswer.match(bookingRegex);
      if (bookingMatch && bookingMatch[1]) {
        try {
          const data = JSON.parse(bookingMatch[1]);
          const { customerName, customerPhone, serviceName, date, startTime } = data;
          if (customerName && customerPhone && serviceName && startTime) {
            const rawDate = String(date || '').trim().toLowerCase();
            const finalDate = (rawDate === 'hoy' || !rawDate) ? todayISO : rawDate;
            const reservationId = db.collection(`businesses/${businessId}/reservations`).doc().id;
            await db.collection(`businesses/${businessId}/reservations`).doc(reservationId).set({
              businessId, customerName, customerPhone, serviceName, date: finalDate, startTime, 
              status: 'pending', source: 'chatbot', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
            }, { merge: true });
            rawAnswer = rawAnswer.replace(bookingRegex, '').trim();
          }
        } catch (e) {}
      }

      return { answer: rawAnswer, source: 'ai_generated', detectedProductId, detectedCouponCode };

    } catch (error: any) {
      return { answer: "Lo siento, tuve un inconveniente al procesar tu consulta.", source: 'fallback' };
    }
  }
);
