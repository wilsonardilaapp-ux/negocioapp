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
 * Herramienta para registrar una cita real en Firestore.
 */
const bookAppointmentTool = ai.defineTool(
  {
    name: 'bookAppointmentTool',
    description: 'Registra una nueva cita o reserva en la base de datos de la empresa. Utilízala SOLAMENTE cuando tengas el nombre del cliente, su teléfono de WhatsApp, el servicio solicitado, la fecha y la hora de inicio. Retorna los datos de confirmación.',
    inputSchema: z.object({
      businessId: z.string().describe('ID del negocio donde se hará la reserva'),
      customerName: z.string().describe('Nombre completo del cliente'),
      customerPhone: z.string().describe('Número de WhatsApp del cliente'),
      serviceName: z.string().describe('Nombre del servicio que desea agendar'),
      date: z.string().describe('Fecha de la cita (cualquier formato)'),
      startTime: z.string().describe('Hora de inicio de la cita en formato HH:mm (24h)'),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
      appointment: z.any().optional(),
    }),
  },
  async (input) => {
    try {
      const db = await getAdminFirestore();
      const { businessId, customerName, customerPhone, serviceName, date, startTime } = input;

      // 1. Normalización de Fecha
      const normalizedDate = normalizeDateToISO(date);

      // 2. Buscar detalles del servicio para obtener duración y precio real
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
      const serviceId = matchedService?.id || 'bot_auto_matched';

      // 3. Calcular hora de fin
      const endTime = calculateEndTime(startTime, duration);

      // 4. Crear objeto de reserva compatible con la Agenda operativa
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
        message: 'Reserva persistida correctamente en la base de datos.',
        appointment: reservationData
      };
    } catch (error: any) {
      console.error("[bookAppointmentTool] Error fatal:", error.message);
      return { success: false, message: "Hubo un error técnico al guardar la reserva en el sistema." };
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
    
    // El bot de plataforma siempre está activo
    const isPlatformBot = businessId === 'platform-bot';
    if (!isPlatformBot && !localConfig.isActive) {
      return { 
        answer: "Lo siento, el asistente virtual está fuera de línea. Por favor utiliza nuestros números de contacto.", 
        source: 'fallback' 
      };
    }

    // --- PASO 4: MOTOR DE IA OFICIAL DE MARKIX (Gobernanza Nivel 2 + TOOLS) ---
    try {
      const catalogSnap = await db.collection(`businesses/${businessId}/publicData`).doc('catalog').get();
      const catalogData = catalogSnap.exists ? catalogSnap.data() : null;
      const products = catalogData?.products || [];
      const formattedCatalog = (Array.isArray(products) ? products : []).map((p: any) => 
        `- ${p?.name || 'Producto'}: $${p?.price ?? 0} (${p?.category || 'General'})`
      ).join('\n');

      const aiConfig = await getAIConfig(businessId);
      if (!aiConfig.apiKey) throw new Error("Sin API Key.");

      const businessSnapForName = await db.collection('businesses').doc(businessId).get();
      const businessName = businessSnapForName.data()?.name || "nuestro negocio";

      const context = `
        NEGOCIO: ${businessName}
        CATÁLOGO DISPONIBLE:
        ${formattedCatalog || 'Consulta con un asesor para disponibilidad.'}
      `;

      const systemPrompt = `Eres el asistente virtual oficial de ${businessName}. 
      Responde de forma amable y muy concisa. No inventes precios.
      
      INSTRUCCIONES DE AGENDAMIENTO (REGLAS ESTRICTAS):
      1. Cuando el cliente solicite una cita, turno o reserva, DEBES solicitar: nombre, WhatsApp, servicio y fecha/hora.
      2. No confirmes citas de forma ficticia. 
      3. Solo después de ejecutar 'bookAppointmentTool' y recibir success: true, muestra el resumen de confirmación al cliente.
      4. El resumen debe incluir: Servicio, Fecha (legible), Hora e ID de Reserva.
      5. Si la herramienta falla, informa que hay un inconveniente técnico y sugiere contactar por teléfono.`;

      const formattedHistory = history.map(h => ({
        role: h.role === 'model' ? 'model' as const : 'user' as const,
        content: [{ text: h.content }]
      }));

      if (aiConfig.provider === 'googleai') {
        const response = await ai.generate({
          model: `googleai/${aiConfig.model}`,
          tools: [bookAppointmentTool],
          messages: [
            { role: 'system', content: [{ text: systemPrompt }] },
            ...formattedHistory,
            { role: 'user', content: [{ text: `ID NEGOCIO: ${businessId}\nContexto: ${context}\n\nPregunta: ${question}` }] }
          ],
          config: { temperature: 0.2, apiKey: aiConfig.apiKey }
        });
        
        return { 
          answer: response.text || "Lo siento, no pude procesar tu solicitud. Intenta de nuevo.", 
          source: 'ai_generated' 
        };
      }

      throw new Error("Proveedor no compatible con herramientas ejecutivas.");

    } catch (error: any) {
      console.error("[Chatbot Pipeline Error]:", error.message);
      return { 
        answer: "Lo siento, el motor de inteligencia está teniendo dificultades técnicas. Por favor intenta de nuevo o contacta al negocio.", 
        source: 'fallback' 
      };
    }
  }
);