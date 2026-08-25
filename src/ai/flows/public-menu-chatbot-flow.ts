'use server';

/**
 * @fileOverview Flujo de Genkit para el chatbot del menú público.
 * 
 * RE-ARQUITECTURA (Estabilización Operativa):
 * - Se mueve 'bookAppointmentTool' al nivel superior para evitar errores de registro duplicado en Genkit.
 * - Se incluye 'businessId' en el esquema de la herramienta para soporte multi-inquilino.
 * - Se implementa normalización estricta de formatos (YYYY-MM-DD y HH:mm 24h).
 * - Se garantiza la persistencia en Firestore mediante Firebase Admin SDK.
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
import { calculateEndTime } from '@/lib/booking-engine';

/**
 * Normaliza una fecha recibida al estándar YYYY-MM-DD.
 */
function normalizeDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const clean = dateStr.replace(/[^\d/-]/g, '');
  const parts = clean.split(/[/-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return dateStr;
}

/**
 * Normaliza la hora al formato 24h HH:mm.
 */
function normalizeTime(timeStr: string): string {
  const clean = timeStr.toLowerCase().trim();
  const match = clean.match(/(\d{1,2}):(\d{2})\s*(pm|am|p\.m\.|a\.m\.)?/);
  if (!match) return timeStr;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = match[3];
  if (ampm && ampm.includes('p') && hours < 12) hours += 12;
  if (ampm && ampm.includes('a') && hours === 12) hours = 0;
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

/**
 * HERRAMIENTA EJECUTIVA: bookAppointmentTool
 * Se define fuera del flujo para evitar el error "Action already registered".
 */
export const bookAppointmentTool = ai.defineTool(
  {
    name: 'bookAppointmentTool',
    description: 'Registra una reserva en el sistema de citas de Firestore.',
    inputSchema: z.object({
      businessId: z.string().describe('ID único del negocio (inquilino)'),
      customerName: z.string().describe('Nombre del cliente'),
      customerPhone: z.string().describe('WhatsApp del cliente'),
      serviceName: z.string().describe('Nombre del servicio solicitado'),
      date: z.string().describe('Fecha de la cita en formato YYYY-MM-DD'),
      startTime: z.string().describe('Hora de inicio en formato HH:mm (24h)'),
    }),
  },
  async (toolInput) => {
    console.log(`[bookAppointmentTool] Ejecutando guardado para: ${toolInput.customerName} en ${toolInput.businessId}`);
    
    try {
      const db = await getAdminFirestore();
      const normalizedDate = normalizeDate(toolInput.date);
      const normalizedStartTime = normalizeTime(toolInput.startTime);
      
      // Búsqueda de servicio para obtener metadatos (duración/precio)
      const servicesSnap = await db.collection(`businesses/${toolInput.businessId}/bookingServices`).get();
      const service = servicesSnap.docs.map(d => ({id: d.id, ...d.data()} as any))
        .find(s => s.name.toLowerCase().includes(toolInput.serviceName.toLowerCase()));

      const reservationId = db.collection('placeholder').doc().id;
      const duration = service?.durationMinutes || 45;
      const price = service?.price || 0;

      const reservationData = {
        id: reservationId,
        businessId: toolInput.businessId,
        customerName: toolInput.customerName.trim(),
        customerPhone: toolInput.customerPhone.trim(),
        serviceId: service?.id || 'chatbot_generic',
        serviceName: service?.name || toolInput.serviceName,
        staffId: null,
        staffName: "Pendiente de asignación",
        date: normalizedDate,
        startTime: normalizedStartTime,
        endTime: calculateEndTime(normalizedStartTime, duration),
        price: price,
        durationMinutes: duration,
        status: 'pending',
        source: 'chatbot',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Sanitización atómica para evitar errores de campos undefined en Firestore
      const cleanData = JSON.parse(JSON.stringify(reservationData));

      await db.collection(`businesses/${toolInput.businessId}/reservations`).doc(reservationId).set(cleanData);
      
      console.log(`[bookAppointmentTool] ÉXITO: Cita guardada en ID REAL: businesses/${toolInput.businessId}/reservations/${reservationId}`);

      return { 
        success: true, 
        reservationId: reservationId.slice(-6).toUpperCase(),
        date: normalizedDate,
        startTime: normalizedStartTime,
        customerName: toolInput.customerName,
        serviceName: service?.name || toolInput.serviceName
      };
    } catch (error: any) {
      console.error("[bookAppointmentTool] Error crítico:", error.message);
      return { 
        success: false, 
        error: "No se pudo conectar con la base de datos de reservas." 
      };
    }
  }
);

export const publicMenuChatbotFlow = ai.defineFlow(
  {
    name: 'publicMenuChatbotFlow',
    inputSchema: PublicMenuChatbotInputSchema,
    outputSchema: PublicMenuChatbotOutputSchema,
  },
  async (input): Promise<PublicMenuChatbotOutput> => {
    const db = await getAdminFirestore();
    const { businessId, question, history = [] } = input;
    const lowQuestion = question.toLowerCase().trim();

    // --- PASO 1: GUARDIA DE PRIORIDAD PARA AGENDAMIENTO ---
    const appointmentIntents = ['cita', 'agendar', 'reserva', 'turno', 'reservar'];
    const isAppointmentIntent = appointmentIntents.some(intent => lowQuestion.includes(intent));

    // Si NO es una intención de agendamiento, procesamos respuestas rápidas de contacto/ubicación
    if (!isAppointmentIntent) {
        try {
          const responsesSnap = await db.collection(`businesses/${businessId}/publicMenuChatbot/main/responses`)
            .where('isActive', '==', true).get();
          const matchedCustom = responsesSnap.docs.find(doc => lowQuestion.includes(doc.data().question?.toLowerCase().trim() || ''));
          if (matchedCustom) return { answer: matchedCustom.data().answer, source: 'custom_response' };
        } catch (e) {}

        const businessSnap = await db.collection('businesses').doc(businessId).get();
        if (businessSnap.exists) {
            const bData = businessSnap.data();
            const infoTriggers = ['donde queda', 'ubicación', 'direccion', 'teléfono', 'contacto', 'whatsapp'];
            if (infoTriggers.some(t => lowQuestion.includes(t))) {
              return { 
                answer: `Estamos ubicados en ${bData?.address || 'nuestra sede'}. Tel: ${bData?.phone || 'N/A'}.`, 
                source: 'business_info' 
              };
            }
        }
    }

    // --- PASO 2: EJECUCIÓN DEL MOTOR DE IA ---
    try {
      const catalogSnap = await db.collection(`businesses/${businessId}/publicData`).doc('catalog').get();
      const products = catalogSnap.data()?.products || [];
      const formattedCatalog = products.map((p: any) => `- ${p.name}: $${p.price}`).join('\n');

      const aiConfig = await getAIConfig(businessId);
      
      const systemPrompt = `Eres el asistente virtual oficial del negocio.
      CATÁLOGO DE SERVICIOS/PRODUCTOS:
      ${formattedCatalog}
      
      REGLAS CRÍTICAS:
      1. Si el cliente quiere agendar, solicita: Nombre, WhatsApp, Servicio y Fecha/Hora.
      2. Cuando tengas los datos, usa obligatoriamente la herramienta 'bookAppointmentTool'.
      3. IMPORTANTE: Para la herramienta, utiliza siempre businessId: '${businessId}'. No lo inventes.
      4. SOLO confirma la cita cuando la herramienta devuelva éxito.
      5. NO redactes confirmaciones falsas. Si la herramienta no se ejecuta, dile al cliente que estás procesando sus datos.
      6. Formato de respuesta tras éxito: Muestra el ID de reserva, servicio, fecha y hora de forma estructurada.`;

      const response = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        tools: [bookAppointmentTool],
        messages: [
          { role: 'system', content: [{ text: systemPrompt }] },
          ...history.map(h => ({ role: h.role as any, content: [{ text: h.content }] })),
          { role: 'user', content: [{ text: question }] }
        ],
        config: { temperature: 0.1, apiKey: aiConfig.apiKey }
      });
      
      return { 
        answer: response.text || "Tu solicitud ha sido procesada.", 
        source: 'ai_generated' 
      };

    } catch (error: any) {
      console.error("[REAL_CHATBOT_ERROR]:", error);
      return { 
        answer: "Lo siento, tuve un inconveniente al procesar tu consulta. Por favor intenta de nuevo o contacta al negocio.", 
        source: 'fallback' 
      };
    }
  }
);