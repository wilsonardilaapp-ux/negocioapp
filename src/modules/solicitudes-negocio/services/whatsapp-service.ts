import { getAdminFirestore } from '@/firebase/server-init';

interface SendWhatsAppParams {
  toPhone: string;
  template: string;
  variables: {
    nombre: string;
    nombre_completo?: string;
    telefono: string;
    categoria: string;
    imagenes: string;
    estilo?: string;
    enlace: string;
  };
  customToken?: string;
}

export function formatWhatsappNumber(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '').replace(/^0+/, '');
  // Formato para Colombia (10 dígitos que empiezan por 3)
  if (clean.length === 10 && clean.startsWith('3')) {
    clean = '57' + clean;
  }
  // Formato para Perú (9 dígitos que empiezan por 9)
  else if (clean.length === 9 && clean.startsWith('9')) {
    clean = '51' + clean;
  }
  return clean;
}

export async function enviarWhatsAppSolicitud(params: SendWhatsAppParams): Promise<{ success: boolean; whatsappUrl?: string; error?: string }> {
  try {
    let cleanPhone = formatWhatsappNumber(params.toPhone);
    if (!cleanPhone) {
      return { success: false, error: 'Número de WhatsApp de destino inválido o vacío' };
    }

    // Interpolar variables
    let mensaje = params.template || 'Notificación de Solicitud: {nombre}';
    mensaje = mensaje.replace(/{nombre}/g, params.variables.nombre || 'N/A');
    mensaje = mensaje.replace(/{nombre_completo}/g, params.variables.nombre_completo || 'N/A');
    mensaje = mensaje.replace(/{telefono}/g, params.variables.telefono || 'N/A');
    mensaje = mensaje.replace(/{categoria}/g, params.variables.categoria || 'N/A');
    mensaje = mensaje.replace(/{imagenes}/g, params.variables.imagenes || 'Ninguna');
    mensaje = mensaje.replace(/{estilo}/g, params.variables.estilo || 'No especificado');
    mensaje = mensaje.replace(/{estilo_preferido}/g, params.variables.estilo || 'No especificado');
    mensaje = mensaje.replace(/{enlace}/g, params.variables.enlace || '');

    // Intentar buscar token de WHAPI (opcional)
    let token = params.customToken || process.env.WHAPI_TOKEN || process.env.WHATSAPP_API_TOKEN;
    if (!token) {
      try {
        const db = await getAdminFirestore();
        const integrationSnap = await db.doc('integrations/whatsapp').get();
        if (integrationSnap.exists) {
          const data = integrationSnap.data();
          token = data?.token || data?.apiKey;
        }
      } catch (e) {
        // silencioso
      }
    }

    // Si HAY token de WHAPI, intentamos enviar vía API automática
    if (token) {
      try {
        const recipient = cleanPhone.includes('@') ? cleanPhone : cleanPhone + '@s.whatsapp.net';
        const response = await fetch('https://gate.whapi.cloud/messages/text', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ to: recipient, body: mensaje })
        });
        if (response.ok) {
          return { success: true };
        }
      } catch (err) {
        console.warn('[WHAPI Warning] Falló envío automático, usando fallback a WhatsApp Web:', err);
      }
    }

    // Si NO hay token (o falló WHAPI), generamos el enlace directo a WhatsApp Web / App
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(mensaje)}`;
    return {
      success: true,
      whatsappUrl
    };

  } catch (error: any) {
    return { success: false, error: error?.message || 'Error al procesar WhatsApp' };
  }
}
