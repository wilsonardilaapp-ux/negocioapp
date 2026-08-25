'use server';

/**
 * @fileOverview Flujo de Genkit para el chatbot del menú público.
 * Implementa una jerarquía de respuesta resiliente y gobernanza de proveedores.
 * 1. Priorización de Agendamiento (Bypass de respuestas fijas)
 * 2. Respuestas Manuales (Triggers exactos)
 * 3. Info Negocio (Teléfono/Dirección/Ubicación)
 * 4. Gobernanza Nivel 1: Validación de Activación (SaaS Inquilino)
 * 5. Gobernanza Nivel 2: Motor de IA oficial de la plataforma (getAIConfig) con Memoria Conversacional.
 * 6. Herramientas Ejecutivas: Persistencia real de citas en Firestore con normalización de fecha.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAdminFirestore } from '@/firebase/server-init';
import { 
  PublicMenuChatbotInputSchema, 
  PublicMenuChatbotOutputSchema, 
  PublicMenuChatbotOutput,
  DEFAULT_CHATBOT_CONFIG,
  PublicMenuChatbotConfig
} from '@/models/public-menu-chatbot';
import { getAIConfig } from './chat-flow';
import { calculateEndTime } from '@/lib/booking-engine';

/**
 * Normaliza una fecha recibida en diversos formatos (DD/MM/YYYY o YYYY-MM-DD)
 * al estándar estricto YYYY-MM-DD requerido por la Agenda.
 */
function normalizeDateToISO(dateStr: string): string {
  const clean = dateStr.replace(/[^\d/-]/g, '');
  if (/\d{4}-\d{2}-\d{2}/.test(clean)) return clean;
  
  const parts = clean.split(/[/-]/);
  if (parts.length === 3) {
    // Si empieza por el año (YYYY-MM-DD o YYYY/MM/DD)
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
    // Si empieza por el día (DD-MM-YYYY o DD/MM/YYYY)
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return dateStr;
}

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

    // --- PASO 0: DETECCIÓN DE INTENCIÓN DE AGENDAMIENTO (Bypass prioritario) ---
    const appointmentIntents = ['cita', 'agendar', 'reserva', 'turno', 'reservar'];
    const isAppointmentIntent = appointmentIntents.some(intent => lowQuestion.includes(intent));

    // --- HERRAMIENTA EJECUTIVA (DEFINIDA DENTRO DEL FLOW PARA CAPTURAR EL businessId) ---
    const bookAppointmentTool = ai.defineTool(
      {
        name: 'bookAppointmentTool',
        description: 'Registra una nueva cita o reserva en la base de datos. Utilízala SOLAMENTE cuando tengas el nombre del cliente, su WhatsApp, el servicio, la fecha y la hora.',
        inputSchema: z.object({
          customerName: z.string().describe('Nombre completo del cliente'),
          customerPhone: z.string().describe('Número de WhatsApp del cliente'),
          serviceName: z.string().describe('Nombre del servicio'),
          date: z.string().describe('Fecha de la cita en formato YYYY-MM-DD'),
          startTime: z.string().describe('Hora de inicio en formato HH:mm (24h)'),
        }),
        outputSchema: z.object({
          success: z.boolean(),
          reservationId: z.string(),
          customerName: z.string(),
          serviceName: z.string(),
          date: z.string(),
          startTime: z.string(),
        }),
      },
      async (toolInput) => {
        // Captura directa de businessId desde el closure del flow
        const { customerName, customerPhone, serviceName, date, startTime } = toolInput;
        const normalizedDate = normalizeDateToISO(date);

        const servicesSnap = await db.collection(`businesses/${businessId}/bookingServices`)
          .where('isActive', '==', true)
          .get();
        
        const allServices = servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        const matchedService = allServices.find((s: any) => 
          s.name.toLowerCase().includes(serviceName.toLowerCase()) || 
          serviceName.toLowerCase().includes(s.name.toLowerCase())
        );

        const duration = matchedService?.durationMinutes || 30;
        const price = matchedService?.price || 0;
        const serviceId = matchedService?.id || 'bot_auto';
        const endTime = calculateEndTime(startTime, duration);

        const reservationRef = db.collection(`businesses/${businessId}/reservations`).doc();
        const reservationId = reservationRef.id;
        const now = new Date().toISOString();

        const reservationData = {
          id: reservationId,
          businessId,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          serviceId,
          serviceName: matchedService?.name || serviceName,
          staffId: null,
          staffName: 'Pendiente de asignación',
          date: normalizedDate,
          startTime,
          endTime,
          status: 'pending' as const,
          price,
          durationMinutes: duration,
          source: 'web' as const,
          createdAt: now,
          updatedAt: now,
        };

        await reservationRef.set(reservationData);

        return { 
          success: true, 
          reservationId: reservationId.slice(-6).toUpperCase(),
          customerName,
          serviceName: reservationData.serviceName,
          date: normalizedDate,
          startTime 
        };
      }
    );

    // Si NO es una intención de agendar, procesamos las respuestas fijas normalmente
    if (!isAppointmentIntent) {
        // --- PASO 1: RESPUESTAS PERSONALIZADAS ---
        try {
          const responsesSnap = await db.collection(`businesses/${businessId}/publicMenuChatbot/main/responses`)
            .where('isActive', '==', true)
            .get();
          
          const matchedCustom = responsesSnap.docs.find(doc => {
            const data = doc.data();
            return lowQuestion.includes(data.question?.toLowerCase().trim() || '');
          });

          if (matchedCustom) {
            return { answer: matchedCustom.data().answer, source: 'custom_response' };
          }
        } catch (e) {
          console.warn("[Chatbot] Error in custom responses lookup:", e);
        }

        // --- PASO 2: INFORMACIÓN DEL NEGOCIO ---
        const businessSnap = await db.collection('businesses').doc(businessId).get();
        const bData = businessSnap.exists ? businessSnap.data() : null;
        
        if (bData) {
            const infoTriggers = ['donde queda', 'ubicación', 'direccion', 'teléfono', 'contacto', 'whatsapp', 'horario', 'redes'];
            if (infoTriggers.some(t => lowQuestion.includes(t))) {
              let infoMsg = `Estamos ubicados en ${bData?.address || 'nuestra sede principal'}. `;
              if (bData?.phone) infoMsg += `Puedes contactarnos al ${bData.phone}. `;
              return { answer: infoMsg, source: 'business_info' };
            }
        }
    }

    // --- PASO 3: GOBERNANZA NIVEL 1 (Autorización del Inquilino) ---
    const localConfigSnap = await db.doc(`businesses/${businessId}/publicMenuChatbot/main`).get();
    const localConfig = (localConfigSnap.exists ? localConfigSnap.data() : DEFAULT_CHATBOT_CONFIG) as PublicMenuChatbotConfig;
    
    const isPlatformBot = businessId === 'platform-bot';
    if (!isPlatformBot && !localConfig.isActive) {
      return { 
        answer: "Lo siento, el asistente virtual está fuera de línea. Por favor utiliza nuestros números de contacto.", 
        source: 'fallback' 
      };
    }

    // --- PASO 4: MOTOR DE IA OFICIAL (Google AI para soporte de TOOLS) ---
    try {
      const catalogSnap = await db.collection(`businesses/${businessId}/publicData`).doc('catalog').get();
      const catalogData = catalogSnap.exists ? catalogSnap.data() : null;
      const products = catalogData?.products || [];
      const formattedCatalog = (Array.isArray(products) ? products : []).map((p: any) => 
        `- ${p?.name || 'Producto'}: $${p?.price ?? 0}`
      ).join('\n');

      const aiConfig = await getAIConfig(businessId);
      if (!aiConfig.apiKey) throw new Error("Sin API Key.");

      const businessSnapForName = await db.collection('businesses').doc(businessId).get();
      const businessName = businessSnapForName.data()?.name || "nuestro negocio";

      const systemPrompt = `Eres el asistente virtual de ${businessName}. 
      Responde de forma amable y muy concisa.
      
      INSTRUCCIONES DE AGENDAMIENTO:
      1. Si el cliente quiere una cita/reserva, DEBES pedir: nombre, WhatsApp, servicio y fecha/hora.
      2. No inventes que la cita está guardada. 
      3. Ejecuta 'bookAppointmentTool' para persistir la reserva en el sistema.
      4. Solo después de recibir éxito de la herramienta, confirma al cliente con los detalles y el ID de reserva.
      5. Formato de fecha para la herramienta: YYYY-MM-DD.`;

      const formattedHistory = history.map(h => ({
        role: h.role === 'model' ? 'model' as const : 'user' as const,
        content: [{ text: h.content }]
      }));

      // FORZAMOS googleai para garantizar compatibilidad con TOOLS
      const response = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        tools: [bookAppointmentTool],
        messages: [
          { role: 'system', content: [{ text: systemPrompt }] },
          ...formattedHistory,
          { role: 'user', content: [{ text: `CATÁLOGO:\n${formattedCatalog}\n\nPREGUNTA: ${question}` }] }
        ],
        config: { temperature: 0.2, apiKey: aiConfig.apiKey }
      });
      
      return { 
        answer: response.text || "He registrado tu solicitud, ¿puedo ayudarte en algo más?", 
        source: 'ai_generated' 
      };

    } catch (error: any) {
      console.error("[Chatbot Pipeline Error]:", error.message);
      return { 
        answer: "Lo siento, tuve un inconveniente al procesar tu reserva. Por favor intenta de nuevo o contacta al negocio.", 
        source: 'fallback' 
      };
    }
  }
);