const fs = require('fs');
const path = require('path');

console.log('==============================================');
console.log('APLICANDO FASE B: Servicios, WhatsApp y API');
console.log('==============================================');

// 1. Asegurar directorios
const dirs = [
  'src/modules/solicitudes-negocio/services',
  'src/app/api/solicitudes-negocio'
];
dirs.forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// 2. Crear whatsapp-service.ts
const whatsappServiceContent = `import { getAdminFirestore } from '@/firebase/server-init';

interface SendWhatsAppParams {
  toPhone: string;
  template: string;
  variables: {
    nombre: string;
    telefono: string;
    categoria: string;
    imagenes: string;
    enlace: string;
  };
  customToken?: string;
}

export async function enviarWhatsAppSolicitud(params: SendWhatsAppParams): Promise<{ success: boolean; error?: string }> {
  try {
    let cleanPhone = params.toPhone.replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      return { success: false, error: 'Número de WhatsApp de destino no configurado' };
    }

    // Interpolar variables
    let mensaje = params.template;
    mensaje = mensaje.replace(/{nombre}/g, params.variables.nombre || 'N/A');
    mensaje = mensaje.replace(/{telefono}/g, params.variables.telefono || 'N/A');
    mensaje = mensaje.replace(/{categoria}/g, params.variables.categoria || 'N/A');
    mensaje = mensaje.replace(/{imagenes}/g, params.variables.imagenes || 'Ninguna');
    mensaje = mensaje.replace(/{enlace}/g, params.variables.enlace || '');

    // Obtener token de WHAPI (de parámetro, de variable de entorno o de config general)
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
        console.warn('[WhatsApp] No se pudo leer token de integración:', e);
      }
    }

    if (!token) {
      return { success: false, error: 'Token de WHAPI no configurado en entorno ni en integraciones' };
    }

    // Formatear teléfono si no tiene prefijo internacional
    if (cleanPhone.length === 9 || cleanPhone.length === 10) {
      // Si no tiene código de país, asume formato estándar o se deja intacto
      cleanPhone = cleanPhone.startsWith('51') ? cleanPhone : '51' + cleanPhone;
    }

    const recipient = cleanPhone.includes('@') ? cleanPhone : cleanPhone + '@s.whatsapp.net';

    const response = await fetch('https://gate.whapi.cloud/messages/text', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${token}\`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        to: recipient,
        body: mensaje
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[WhatsApp WHAPI Error]:', errText);
      return { success: false, error: \`WHAPI error: \${response.status} - \${errText.slice(0, 100)}\` };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[WhatsApp Service Exception]:', error);
    return { success: false, error: error?.message || 'Error desconocido al enviar WhatsApp' };
  }
}
`;
fs.writeFileSync('src/modules/solicitudes-negocio/services/whatsapp-service.ts', whatsappServiceContent, 'utf8');
console.log('[OK] Creado: src/modules/solicitudes-negocio/services/whatsapp-service.ts');

// 3. Crear solicitudes-service.ts
const solicitudesServiceContent = `import { getAdminFirestore } from '@/firebase/server-init';
import { v2 as cloudinary } from 'cloudinary';
import { DEFAULT_SOLICITUD_CONFIG } from '../constants';
import { SolicitudFormConfig, SolicitudNegocio, SolicitudEstado } from '../types';
import { enviarWhatsAppSolicitud } from './whatsapp-service';

const CONFIG_DOC = 'solicitud_config/main';
const SOLICITUDES_COLLECTION = 'solicitud_negocios';

/**
 * Obtener configuración actual del formulario
 */
export async function getSolicitudConfig(): Promise<SolicitudFormConfig> {
  try {
    const db = await getAdminFirestore();
    const snap = await db.doc(CONFIG_DOC).get();
    if (!snap.exists) {
      return DEFAULT_SOLICITUD_CONFIG;
    }
    return { ...DEFAULT_SOLICITUD_CONFIG, ...(snap.data() as SolicitudFormConfig) };
  } catch (error) {
    console.error('Error al obtener solicitud config:', error);
    return DEFAULT_SOLICITUD_CONFIG;
  }
}

/**
 * Guardar configuración versionada
 */
export async function saveSolicitudConfig(config: Partial<SolicitudFormConfig>): Promise<SolicitudFormConfig> {
  const db = await getAdminFirestore();
  const current = await getSolicitudConfig();
  const updated: SolicitudFormConfig = {
    ...current,
    ...config,
    version: (current.version || 1) + 1,
    updatedAt: new Date().toISOString()
  };

  await db.doc(CONFIG_DOC).set(updated, { merge: true });
  return updated;
}

/**
 * Subir archivo de forma segura a Cloudinary con fallback de URL segura
 */
export async function uploadArchivoSeguro(file: File, folder = 'solicitudes-negocio'): Promise<string> {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Si cloudinary está configurado en variables de entorno
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });

      return new Promise<string>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'auto',
            filename_override: \`\${Date.now()}-\${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}\`
          },
          (error, result) => {
            if (error || !result) {
              reject(error || new Error('Error al subir a Cloudinary'));
            } else {
              resolve(result.secure_url);
            }
          }
        );
        stream.end(buffer);
      });
    }

    // Fallback: Si no hay Cloudinary configurado, guardar en data-url si es imagen pequeña o loguear
    const base64 = buffer.toString('base64');
    return \`data:\${file.type};base64,\${base64}\`;
  } catch (err) {
    console.error('Error al subir archivo:', err);
    throw new Error('No se pudo procesar el archivo subido.');
  }
}

/**
 * Crear nueva solicitud con notificación y WhatsApp desacoplados
 */
export async function crearSolicitud(data: {
  businessName: string;
  phone: string;
  address: string;
  email?: string;
  category: string;
  subcategory?: string;
  description: string;
  socialMedia?: any;
  images?: any;
  products?: any;
  customFieldsData?: any;
  ipAddress?: string;
}): Promise<{ id: string; config: SolicitudFormConfig; whatsappResult: any }> {
  const db = await getAdminFirestore();
  const config = await getSolicitudConfig();

  if (!config.enabled) {
    throw new Error('El módulo de registro de negocios se encuentra temporalmente desactivado.');
  }

  const now = new Date().toISOString();
  const newDocRef = db.collection(SOLICITUDES_COLLECTION).doc();

  const nuevaSolicitud: SolicitudNegocio = {
    id: newDocRef.id,
    businessName: data.businessName,
    phone: data.phone,
    address: data.address,
    email: data.email || '',
    category: data.category,
    subcategory: data.subcategory || '',
    description: data.description,
    socialMedia: data.socialMedia || {},
    images: data.images || {},
    products: data.products || {},
    status: 'Recibido',
    internalNotes: [],
    customFieldsData: data.customFieldsData || {},
    whatsappStatus: 'pending',
    ipAddress: data.ipAddress || '',
    createdAt: now,
    updatedAt: now
  };

  // 1. Guardar solicitud en Firestore
  await newDocRef.set(nuevaSolicitud);

  // 2. Crear notificación en la bandeja existente de superadmin (contactMessages)
  try {
    await db.collection('contactMessages').add({
      name: data.businessName,
      email: data.email || 'no-email@markix.app',
      phone: data.phone,
      subject: \`Nueva Solicitud de Negocio: \${data.businessName}\`,
      message: \`Se ha recibido una nueva solicitud de negocio para la categoría "\${data.category}". Ver detalle en el panel.\`,
      solicitudId: newDocRef.id,
      module: 'solicitudes-negocio',
      read: false,
      isResolved: false,
      createdAt: now
    });
  } catch (e) {
    console.error('Error creando notificación superadmin:', e);
  }

  // 3. Preparar resumen de imágenes requeridas
  const imagenesPedidas = [];
  if (data.images?.noLogoCreateForMe) imagenesPedidas.push('Logo');
  if (data.images?.noBannerCreateForMe) imagenesPedidas.push('Banner');
  if (data.products?.noProductsPhotosCreateForMe) imagenesPedidas.push('Fotos de Productos');
  const imagenesStr = imagenesPedidas.length > 0 ? imagenesPedidas.join(', ') : 'Ninguna (cliente las subió)';

  // 4. Enlace al panel de administración
  const adminUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://markix.app';
  const panelLink = \`\${adminUrl}/superadmin/solicitudes-negocio?id=\${newDocRef.id}\`;

  // 5. Enviar mensaje de WhatsApp (desacoplado)
  let whatsappResult = { success: false, error: 'No configurado' };
  if (config.adminWhatsAppNumber) {
    whatsappResult = await enviarWhatsAppSolicitud({
      toPhone: config.adminWhatsAppNumber,
      template: config.whatsappMessageTemplate || DEFAULT_SOLICITUD_CONFIG.whatsappMessageTemplate,
      variables: {
        nombre: data.businessName,
        telefono: data.phone,
        categoria: data.category,
        imagenes: imagenesStr,
        enlace: panelLink
      }
    });

    // Actualizar estado de WhatsApp en la solicitud
    await newDocRef.update({
      whatsappStatus: whatsappResult.success ? 'sent' : 'failed',
      whatsappError: whatsappResult.error || null
    });
  }

  return { id: newDocRef.id, config, whatsappResult };
}

/**
 * Reenviar WhatsApp manualmente desde el panel de superadmin
 */
export async function reenviarWhatsAppSolicitud(solicitudId: string): Promise<{ success: boolean; error?: string }> {
  const db = await getAdminFirestore();
  const snap = await db.collection(SOLICITUDES_COLLECTION).doc(solicitudId).get();
  if (!snap.exists) {
    return { success: false, error: 'Solicitud no encontrada' };
  }

  const solicitud = snap.data() as SolicitudNegocio;
  const config = await getSolicitudConfig();

  if (!config.adminWhatsAppNumber) {
    return { success: false, error: 'No hay número de WhatsApp configurado en el editor.' };
  }

  const imagenesPedidas = [];
  if (solicitud.images?.noLogoCreateForMe) imagenesPedidas.push('Logo');
  if (solicitud.images?.noBannerCreateForMe) imagenesPedidas.push('Banner');
  if (solicitud.products?.noProductsPhotosCreateForMe) imagenesPedidas.push('Fotos de Productos');
  const imagenesStr = imagenesPedidas.length > 0 ? imagenesPedidas.join(', ') : 'Ninguna';

  const adminUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://markix.app';
  const panelLink = \`\${adminUrl}/superadmin/solicitudes-negocio?id=\${solicitud.id}\`;

  const result = await enviarWhatsAppSolicitud({
    toPhone: config.adminWhatsAppNumber,
    template: config.whatsappMessageTemplate || DEFAULT_SOLICITUD_CONFIG.whatsappMessageTemplate,
    variables: {
      nombre: solicitud.businessName,
      telefono: solicitud.phone,
      categoria: solicitud.category,
      imagenes: imagenesStr,
      enlace: panelLink
    }
  });

  await db.collection(SOLICITUDES_COLLECTION).doc(solicitudId).update({
    whatsappStatus: result.success ? 'sent' : 'failed',
    whatsappError: result.error || null,
    updatedAt: new Date().toISOString()
  });

  return result;
}

/**
 * Listar solicitudes con filtros
 */
export async function getSolicitudes(filtroEstado?: string): Promise<SolicitudNegocio[]> {
  const db = await getAdminFirestore();
  let query: FirebaseFirestore.Query = db.collection(SOLICITUDES_COLLECTION);

  if (filtroEstado && filtroEstado !== 'todos') {
    query = query.where('status', '==', filtroEstado);
  }

  const snap = await query.orderBy('createdAt', 'desc').get();
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
}

/**
 * Actualizar estado y notas de una solicitud
 */
export async function actualizarEstadoSolicitud(
  solicitudId: string,
  nuevoEstado: SolicitudEstado,
  nuevaNota?: string,
  author?: string
): Promise<void> {
  const db = await getAdminFirestore();
  const docRef = db.collection(SOLICITUDES_COLLECTION).doc(solicitudId);
  const snap = await docRef.get();
  if (!snap.exists) throw new Error('Solicitud no encontrada');

  const current = snap.data() as SolicitudNegocio;
  const notes = current.internalNotes || [];

  if (nuevaNota && nuevaNota.trim()) {
    notes.push({
      id: Date.now().toString(),
      text: nuevaNota.trim(),
      createdAt: new Date().toISOString(),
      author: author || 'Super Admin'
    });
  }

  await docRef.update({
    status: nuevoEstado,
    internalNotes: notes,
    updatedAt: new Date().toISOString()
  });
}
`;
fs.writeFileSync('src/modules/solicitudes-negocio/services/solicitudes-service.ts', solicitudesServiceContent, 'utf8');
console.log('[OK] Creado: src/modules/solicitudes-negocio/services/solicitudes-service.ts');

// 4. Crear endpoint API: src/app/api/solicitudes-negocio/route.ts
const apiRouteContent = `import { NextRequest, NextResponse } from 'next/server';
import { getSolicitudConfig, crearSolicitud, uploadArchivoSeguro } from '@/modules/solicitudes-negocio/services/solicitudes-service';

export const dynamic = 'force-dynamic';

// GET: Configuración pública del formulario
export async function GET() {
  try {
    const config = await getSolicitudConfig();
    // Sanitizar secretos antes de enviar al cliente público
    const sanitizedConfig = {
      ...config,
      backupEmail: undefined
    };
    return NextResponse.json(sanitizedConfig);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error cargando configuración' }, { status: 500 });
  }
}

// POST: Procesar envío completo del formulario
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // 1. Anti-spam: Verificar campo trampa (honeypot)
    const honeypot = formData.get('_hp_website');
    if (honeypot) {
      // Es un bot, responder 200 fingido sin guardar
      return NextResponse.json({ success: true, message: 'Enviado correctamente' });
    }

    // 2. Extraer campos de texto
    const businessName = String(formData.get('businessName') || '').trim();
    const phone = String(formData.get('phone') || '').trim();
    const address = String(formData.get('address') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const category = String(formData.get('category') || '').trim();
    const subcategory = String(formData.get('subcategory') || '').trim();
    const description = String(formData.get('description') || '').trim();

    // Validaciones obligatorias mínimas
    if (!businessName || !phone || !address || !category || !description) {
      return NextResponse.json(
        { error: 'Por favor complete todos los campos obligatorios (*)' },
        { status: 400 }
      );
    }

    if (description.length > 250) {
      return NextResponse.json(
        { error: 'La descripción corta supera el límite de caracteres.' },
        { status: 400 }
      );
    }

    // 3. Redes sociales
    const socialMedia = {
      instagram: String(formData.get('social_instagram') || '').trim(),
      facebook: String(formData.get('social_facebook') || '').trim(),
      tiktok: String(formData.get('social_tiktok') || '').trim(),
      youtube: String(formData.get('social_youtube') || '').trim()
    };

    // 4. Procesar archivos e imágenes
    const noLogoCreateForMe = formData.get('noLogoCreateForMe') === 'true';
    const noBannerCreateForMe = formData.get('noBannerCreateForMe') === 'true';
    const stylePreference = String(formData.get('stylePreference') || '').trim();

    let logoUrl = '';
    const logoFile = formData.get('logoFile') as File | null;
    if (logoFile && logoFile.size > 0 && !noLogoCreateForMe) {
      if (logoFile.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: 'El logo excede el límite de 2 MB.' }, { status: 400 });
      }
      logoUrl = await uploadArchivoSeguro(logoFile, 'solicitudes/logos');
    }

    let bannerUrl = '';
    const bannerFile = formData.get('bannerFile') as File | null;
    if (bannerFile && bannerFile.size > 0 && !noBannerCreateForMe) {
      if (bannerFile.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: 'El banner excede el límite de 2 MB.' }, { status: 400 });
      }
      bannerUrl = await uploadArchivoSeguro(bannerFile, 'solicitudes/banners');
    }

    // 5. Procesar Catálogo y Productos
    const noProductsPhotosCreateForMe = formData.get('noProductsPhotosCreateForMe') === 'true';
    let templateFileUrl = '';
    const templateFile = formData.get('templateFile') as File | null;
    if (templateFile && templateFile.size > 0) {
      if (templateFile.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'El archivo de catálogo excede el límite de 5 MB.' }, { status: 400 });
      }
      templateFileUrl = await uploadArchivoSeguro(templateFile, 'solicitudes/plantillas');
    }

    const productPhotosUrls: string[] = [];
    const productPhotos = formData.getAll('productPhotos') as File[];
    for (const photo of productPhotos) {
      if (photo && photo.size > 0 && productPhotosUrls.length < 18) {
        if (photo.size <= 5 * 1024 * 1024) {
          const url = await uploadArchivoSeguro(photo, 'solicitudes/productos');
          productPhotosUrls.push(url);
        }
      }
    }

    // IP del cliente para auditoría
    const forwarded = req.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : '127.0.0.1';

    // 6. Crear solicitud en la base de datos y despachar WhatsApp desacoplado
    const resultado = await crearSolicitud({
      businessName,
      phone,
      address,
      email,
      category,
      subcategory,
      description,
      socialMedia,
      images: {
        logoUrl,
        noLogoCreateForMe,
        bannerUrl,
        noBannerCreateForMe,
        stylePreference
      },
      products: {
        templateFileUrl,
        noProductsPhotosCreateForMe,
        productPhotosUrls
      },
      ipAddress
    });

    return NextResponse.json({
      success: true,
      solicitudId: resultado.id,
      message: resultado.config.confirmationMessage || 'Información enviada con éxito.',
      whatsappStatus: resultado.whatsappResult.success ? 'Enviado' : 'Registrado (pendiente WhatsApp)'
    });

  } catch (error: any) {
    console.error('Error en API solicitudes-negocio:', error);
    return NextResponse.json(
      { error: error?.message || 'Error interno al procesar la solicitud' },
      { status: 500 }
    );
  }
}
`;
fs.writeFileSync('src/app/api/solicitudes-negocio/route.ts', apiRouteContent, 'utf8');
console.log('[OK] Creado: src/app/api/solicitudes-negocio/route.ts');

console.log('\n==============================================');
console.log('FASE B COMPLETADA CON ÉXITO');
console.log('==============================================');
