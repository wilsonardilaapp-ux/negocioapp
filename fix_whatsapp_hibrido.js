const fs = require('fs');

console.log('=== APLICANDO MODO DIRECTO/MANUAL DE WHATSAPP ===');

function backupAndWrite(file, content) {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, file + '.bak');
  }
  fs.writeFileSync(file, content, 'utf8');
  console.log('✅ Archivo actualizado: ' + file);
}

// 1. MODIFICAR whatsapp-service.ts
const waServicePath = 'src/modules/solicitudes-negocio/services/whatsapp-service.ts';
if (fs.existsSync(waServicePath)) {
  const newWaService = `import { getAdminFirestore } from '@/firebase/server-init';

interface SendWhatsAppParams {
  toPhone: string;
  template: string;
  variables: {
    nombre: string;
    nombre_completo?: string;
    telefono: string;
    categoria: string;
    imagenes: string;
    enlace: string;
  };
  customToken?: string;
}

export function formatWhatsappNumber(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/\\D/g, '').replace(/^0+/, '');
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
            'Authorization': \`Bearer \${token}\`,
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
    const whatsappUrl = \`https://api.whatsapp.com/send?phone=\${cleanPhone}&text=\${encodeURIComponent(mensaje)}\`;
    return {
      success: true,
      whatsappUrl
    };

  } catch (error: any) {
    return { success: false, error: error?.message || 'Error al procesar WhatsApp' };
  }
}
`;
  backupAndWrite(waServicePath, newWaService);
}

// 2. MODIFICAR solicitudes-service.ts (para no exigir adminWhatsAppNumber y usar solicitud.phone)
const solServicePath = 'src/modules/solicitudes-negocio/services/solicitudes-service.ts';
if (fs.existsSync(solServicePath)) {
  let content = fs.readFileSync(solServicePath, 'utf8');

  content = content.replace(
    /if \(!config\.adminWhatsAppNumber\) return \{ success: false, error: 'No hay WhatsApp configurado\.' \};/,
    `const targetPhone = solicitud.phone || config.adminWhatsAppNumber;
  if (!targetPhone) return { success: false, error: 'La solicitud no cuenta con número de teléfono registrado.' };`
  );

  content = content.replace(
    /toPhone:\s*config\.adminWhatsAppNumber,/,
    `toPhone: targetPhone,`
  );

  backupAndWrite(solServicePath, content);
}

// 3. MODIFICAR LA RUTA API PARA DEVOLVER whatsappUrl
const routePath = 'src/app/api/solicitudes-negocio/admin/reenviar-whatsapp/route.ts';
if (fs.existsSync(routePath)) {
  const newRoute = `import { NextRequest, NextResponse } from 'next/server';
import { reenviarWhatsAppSolicitud } from '@/modules/solicitudes-negocio/services/solicitudes-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { solicitudId } = await req.json();
    if (!solicitudId) {
      return NextResponse.json({ error: 'ID de solicitud requerido' }, { status: 400 });
    }

    const resultado: any = await reenviarWhatsAppSolicitud(solicitudId);
    if (!resultado.success) {
      return NextResponse.json({ success: false, error: resultado.error }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'WhatsApp procesado exitosamente',
      whatsappUrl: resultado.whatsappUrl || null 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al reenviar WhatsApp' }, { status: 500 });
  }
}
`;
  backupAndWrite(routePath, newRoute);
}

// 4. MODIFICAR admin-inbox.tsx PARA ABRIR EL CHAT DIRECTAMENTE
const inboxPath = 'src/modules/solicitudes-negocio/components/admin-inbox.tsx';
if (fs.existsSync(inboxPath)) {
  let content = fs.readFileSync(inboxPath, 'utf8');

  // Asegurar que al recibir la URL de WhatsApp la abra en una nueva ventana
  content = content.replace(
    /if \(res\.ok && data\.success\) \{[\s\S]*?setActionMessage\('WhatsApp enviado correctamente vía WHAPI'\);[\s\S]*?\} else \{/,
    `if (res.ok && data.success) {
        if (data.whatsappUrl) {
          window.open(data.whatsappUrl, '_blank');
          setActionMessage('Abriendo WhatsApp...');
        } else {
          setActionMessage('WhatsApp enviado correctamente');
        }
      } else {`
  );

  backupAndWrite(inboxPath, content);
}

console.log('=== TODO APLICADO CORRECTAMENTE ===');
