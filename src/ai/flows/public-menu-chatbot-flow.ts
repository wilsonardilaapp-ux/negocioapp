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

/**
 * Normaliza una hora recibida (ej. "3:00 PM", "15:00", "3 pm") al formato 24h HH:mm.
 */
function normalizeTimeTo24h(timeStr: string): string {
  const clean = timeStr.toLowerCase().trim();
  const timeMatch = clean.match(/(\d{1,2}):(\d{2})\s*(pm|am|p\.m\.|a\.m\.)?/);
  
  if (!timeMatch) return timeStr; 

  let hours = parseInt(timeMatch[1], 10);
  const minutes = timeMatch[2];
  const ampm = timeMatch[3];

  if (ampm && (ampm.includes('p')) && hours < 12) hours += 12;
  if (ampm && (ampm.includes('a')) && hours === 12) hours = 0;

  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

/**
 * HERRAMIENTA EJECUTIVA: Definida a nivel de módulo para evitar registros duplicados.
 */
const bookAppointmentTool = ai.defineTool(
  {
    name: 'bookAppointmentTool',
    description: 'Registra una nueva cita o reserva en la base de datos.',
    inputSchema: z.object({
      businessId: z.string().describe('ID único del negocio proporcionado en el prompt'),
      customerName: z.string().describe('Nombre completo del cliente'),
      customerPhone: z.string().describe('Número de WhatsApp del cliente'),
      serviceName: z.string().describe('Nombre del servicio solicitado'),
      date: z.string().describe('Fecha de la cita (cualquier formato)'),
      startTime: z.string().describe('Hora de inicio de la cita'),
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
    try {
        const { businessId, customerName, customerPhone, serviceName, date, startTime } = toolInput;
        const db = await getAdminFirestore();
        
        const normalizedDate = normalizeDateToISO(date);
        const normalizedTime = normalizeTimeTo24h(startTime);

        // 1. Buscar servicio con lógica flexible (Fuzzy Match)
        let matchedService = null;
        try {
          const servicesSnap = await db.collection(`businesses/${businessId}/bookingServices`)
            .where('isActive', '==', true)
            .get();
          
          const allServices = servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
          matchedService = allServices.find((s: any) => 
            s.name.toLowerCase().includes(serviceName.toLowerCase()) || 
            serviceName.toLowerCase().includes(s.name.toLowerCase())
          );
        } catch (e) {
          console.warn("[bookAppointmentTool] No se pudo consultar catálogo, usando genérico.");
        }

        // 2. Definir valores de respaldo seguros (Safe Defaults)
        const duration = matchedService?.durationMinutes || 45;
        const price = matchedService?.price || 0;
        const serviceId = matchedService?.id || 'chatbot_generic';
        const finalServiceName = matchedService?.name || serviceName;
        const endTime = calculateEndTime(normalizedTime, duration);

        const reservationRef = db.collection(`businesses/${businessId}/reservations`).doc();
        const reservationId = reservationRef.id;
        const now = new Date().toISOString();

        // 3. Construcción y Sanitización del Documento
        const reservationData = {
          id: reservationId,
          businessId,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          serviceId,
          serviceName: finalServiceName,
          staffId: null,
          staffName: 'Pendiente de asignación',
          date: normalizedDate,
          startTime: normalizedTime,
          endTime,
          status: 'pending' as const,
          price,
          durationMinutes: duration,
          source: 'chatbot' as const,
          createdAt: now,
          updatedAt: now,
        };

        // Blindaje total contra campos undefined (Firestore Exception Prevention)
        const cleanPayload = JSON.parse(JSON.stringify(reservationData));
        await reservationRef.set(cleanPayload);

        return { 
          success: true, 
          reservationId: reservationId.slice(-6).toUpperCase(),
          customerName,
          serviceName: finalServiceName,
          date: normalizedDate,
          startTime: normalizedTime
        };
    } catch (error: any) {
        console.error("[bookAppointmentTool] Error controlado en el servidor:", error.message);
        // NO lanzamos error para no romper la IA; devolvemos fracaso controlado
        return { 
          success: false, 
          reservationId: 'ERROR', 
          customerName: '', 
          serviceName: '', 
          date: '', 
          startTime: '' 
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

    // --- PASO 0: DETECCIÓN DE INTENCIÓN DE AGENDAMIENTO (Bypass prioritario) ---
    const appointmentIntents = ['cita', 'agendar', 'reserva', 'turno', 'reservar'];
    const isAppointmentIntent = appointmentIntents.some(intent => lowQuestion.includes(intent));

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
      2. No inventes que la cita está guardada ni confirmes sin haber ejecutado la acción técnica. 
      3. Ejecuta obligatoriamente la herramienta 'bookAppointmentTool' para persistir la reserva.
      4. Para agendar con bookAppointmentTool, utiliza obligatoriamente businessId: '${businessId}'.
      5. SOLO después de recibir éxito de la herramienta, confirma al cliente con los detalles estructurados y el ID de reserva.`;

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
        answer: "Lo siento, tuve un inconveniente al procesar tu consulta. Por favor intenta de nuevo o contacta al negocio.", 
        source: 'fallback' 
      };
    }
  }
);
