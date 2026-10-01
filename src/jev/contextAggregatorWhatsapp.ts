import { getAdminFirestore } from '@/firebase/server-init';
import { obtenerAccionesJev } from './jevMemory';

export interface ChatPendiente {
  id: string;
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail?: string;
  ultimoMensaje: string;
  fechaUltimoMensaje: string;
  minutosEspera: number;
  origen: 'chatConversation' | 'contactSubmission';
}

export interface ContextoWhatsapp {
  businessId: string;
  totalSinResponder: number;
  chatsPendientes: ChatPendiente[];
  historialMemoria: any[];
  estado: 'al_dia' | 'atencion_requerida' | 'sin_datos';
  ultimaActualizacion: string;
}

/**
 * Agregador de contexto para el pilar WhatsApp (SOLO LECTURA).
 * Consulta colecciones existentes de Markix sin escribir nada en ellas.
 */
export async function getContextoWhatsapp(businessId: string): Promise<ContextoWhatsapp> {
  if (!businessId || typeof businessId !== 'string') {
    throw new Error('[JEV CONTEXT WHATSAPP] businessId es obligatorio.');
  }

  const firestore = await getAdminFirestore();
  const chatsPendientes: ChatPendiente[] = [];
  const ahora = new Date().getTime();

  try {
    // 1. Lectura de contactSubmissions (mensajes de contacto pendientes)
    const submissionsSnap = await firestore
      .collection(`businesses/${businessId}/contactSubmissions`)
      .limit(20)
      .get();

    submissionsSnap.forEach((doc) => {
      const data = doc.data();
      const fecha = data.createdAt ? new Date(data.createdAt).getTime() : ahora;
      const minutosEspera = Math.max(0, Math.round((ahora - fecha) / (1000 * 60)));

      chatsPendientes.push({
        id: doc.id,
        clienteNombre: data.name || data.customerName || 'Cliente Web',
        clienteTelefono: data.phone || data.customerPhone || 'Sin teléfono',
        clienteEmail: data.email || data.customerEmail || undefined,
        ultimoMensaje: data.message || data.notes || 'Mensaje de contacto recibido.',
        fechaUltimoMensaje: data.createdAt || new Date().toISOString(),
        minutosEspera,
        origen: 'contactSubmission',
      });
    });

    // 2. Lectura de chatConversations (conversaciones del chatbot / WhatsApp)
    try {
      const convsSnap = await firestore
        .collection(`businesses/${businessId}/chatConversations`)
        .limit(20)
        .get();

      convsSnap.forEach((doc) => {
        const data = doc.data();
        const fecha = data.startTime ? new Date(data.startTime).getTime() : ahora;
        const minutosEspera = Math.max(0, Math.round((ahora - fecha) / (1000 * 60)));

        // Solo incluir si no está ya en la lista
        if (!chatsPendientes.some(c => c.id === doc.id)) {
          chatsPendientes.push({
            id: doc.id,
            clienteNombre: data.userName || data.customerName || `Cliente #${doc.id.slice(-4)}`,
            clienteTelefono: data.userPhone || data.customerPhone || 'WhatsApp',
            ultimoMensaje: data.lastMessage || data.summary || 'Consulta en chat iniciada.',
            fechaUltimoMensaje: data.startTime || new Date().toISOString(),
            minutosEspera,
            origen: 'chatConversation',
          });
        }
      });
    } catch (e) {
      // Colección opcional: no bloquea el flujo si el negocio aún no tiene chats
    }

    // 3. Lectura de memoria previa de JEV (Regla 6 y 9: solo lectura vía jevMemory)
    const historialMemoria = await obtenerAccionesJev({
      usuario: businessId,
      tipo: 'whatsapp',
      limite: 10,
    });

    // Ordenar de mayor a menor tiempo de espera
    chatsPendientes.sort((a, b) => b.minutosEspera - a.minutosEspera);

    const totalSinResponder = chatsPendientes.length;
    const estado = totalSinResponder === 0 ? 'al_dia' : 'atencion_requerida';

    return {
      businessId,
      totalSinResponder,
      chatsPendientes,
      historialMemoria,
      estado,
      ultimaActualizacion: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('[JEV CONTEXT WHATSAPP] Error al agregar contexto:', error);
    return {
      businessId,
      totalSinResponder: 0,
      chatsPendientes: [],
      historialMemoria: [],
      estado: 'sin_datos',
      ultimaActualizacion: new Date().toISOString(),
    };
  }
}

/**
 * Función pública para el Resumen Ejecutivo (Fase 7)
 */
export async function getMetricasPilarWhatsapp(businessId: string) {
  const contexto = await getContextoWhatsapp(businessId);
  return {
    pilar: 'whatsapp',
    sinResponder: contexto.totalSinResponder,
    estado: contexto.estado,
    alertaCritica: contexto.chatsPendientes.some(c => c.minutosEspera > 120),
  };
}
