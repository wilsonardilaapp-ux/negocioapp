
function renderizarPlantillaWhatsApp(plantillaRaw: string, vars: {
  nombre: string;
  nombre_completo: string;
  telefono: string;
  direccion: string;
  categoria: string;
  plan: string;
  valor: string;
  metodo_pago: string;
  comprobante: string;
  imagenes: string;
  enlace: string;
}): string {
  // 1. Sanitizar eliminando cualquier caracter U+FFFD () corrupto
  let limpia = (plantillaRaw || '').replace(/\uFFFD/g, '');

  // Parche inteligente: Si la plantilla en BD es antigua y no tiene el nombre completo, inyectarlo
  if (!limpia.includes('{nombre_completo}')) {
    limpia = limpia.replace('{nombre}', '{nombre}\n{e_persona} *Nombre completo:* {nombre_completo}');
  }

  // 2. Reemplazar marcadores de emojis usando String.fromCodePoint de forma segura
  limpia = limpia.replace(/{e_nuevo}/g, String.fromCodePoint(0x1F195));
  limpia = limpia.replace(/{e_negocio}/g, String.fromCodePoint(0x1F3EA));
  limpia = limpia.replace(/{e_persona}/g, String.fromCodePoint(0x1F464));
  limpia = limpia.replace(/{e_telefono}/g, String.fromCodePoint(0x1F4DE));
  limpia = limpia.replace(/{e_direccion}/g, String.fromCodePoint(0x1F4CD));
  limpia = limpia.replace(/{e_categoria}/g, String.fromCodePoint(0x1F3F7));
  limpia = limpia.replace(/{e_plan}/g, String.fromCodePoint(0x1F4E6));
  limpia = limpia.replace(/{e_pago}/g, String.fromCodePoint(0x1F4B3));
  limpia = limpia.replace(/{e_comprobante}/g, String.fromCodePoint(0x1F9FE));
  limpia = limpia.replace(/{e_imagenes}/g, String.fromCodePoint(0x1F3A8));
  limpia = limpia.replace(/{e_enlace}/g, String.fromCodePoint(0x1F517));

  // 3. Reemplazar variables de texto
  limpia = limpia.replace(/{nombre}/g, vars.nombre || 'N/A');
  limpia = limpia.replace(/{nombre_completo}/g, vars.nombre_completo || 'No registrado');
  limpia = limpia.replace(/{telefono}/g, vars.telefono || 'N/A');
  limpia = limpia.replace(/{direccion}/g, vars.direccion || 'N/A');
  limpia = limpia.replace(/{categoria}/g, vars.categoria || 'N/A');
  limpia = limpia.replace(/{plan}/g, vars.plan || 'N/A');
  limpia = limpia.replace(/{valor}/g, vars.valor || 'N/A');
  limpia = limpia.replace(/{metodo_pago}/g, vars.metodo_pago || 'N/A');
  limpia = limpia.replace(/{comprobante}/g, vars.comprobante || 'N/A');
  limpia = limpia.replace(/{imagenes}/g, vars.imagenes || 'Ninguna');
  limpia = limpia.replace(/{enlace}/g, vars.enlace || '');

  // 4. Truncado seguro con Array.from
  const arr = Array.from(limpia);
  if (arr.length > 1500) {
    return arr.slice(0, 1450).join('') + '\n\n' + String.fromCodePoint(0x1F517) + ' ' + vars.enlace;
  }
  return limpia;
}


import { getAdminFirestore } from '@/firebase/server-init';
import { v2 as cloudinary } from 'cloudinary';
import { DEFAULT_SOLICITUD_CONFIG } from '../constants';
import { SolicitudFormConfig, SolicitudNegocio, SolicitudEstado, PaymentStatus } from '../types';
import { enviarWhatsAppSolicitud } from './whatsapp-service';

const CONFIG_DOC = 'solicitud_config/main';
const SOLICITUDES_COLLECTION = 'solicitud_negocios';

export async function getSolicitudConfig(): Promise<SolicitudFormConfig> {
  try {
    const db = await getAdminFirestore();
    const snap = await db.doc(CONFIG_DOC).get();
    if (!snap.exists) return DEFAULT_SOLICITUD_CONFIG;
    const data = snap.data() as any;

    // Normalizar planes existentes de Firestore
    let plans = Array.isArray(data.plans) && data.plans.length > 0 ? data.plans : DEFAULT_SOLICITUD_CONFIG.plans;
    plans = plans.map((p: any) => {
      let updatedPlan = { ...p };
      if (updatedPlan.id === 'plan-gratis' && (updatedPlan.name === 'Plan Activación Básica' || !updatedPlan.name)) {
        updatedPlan.name = 'Plan Básico';
      }
      if (updatedPlan.id === 'plan-vip' && (!updatedPlan.badge || updatedPlan.badge === '')) {
        updatedPlan.badge = '⚡ EXPRESS';
      }
      return updatedPlan;
    });

    return {
      ...DEFAULT_SOLICITUD_CONFIG,
      ...data,
      showCommissionNote: data.showCommissionNote !== false,
      plans,
      paymentInstructions: { ...DEFAULT_SOLICITUD_CONFIG.paymentInstructions, ...(data.paymentInstructions || {}) }
    };
  } catch (error) {
    console.error('Error al obtener solicitud config:', error);
    return DEFAULT_SOLICITUD_CONFIG;
  }
}

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

export async function uploadArchivoSeguro(file: File, folder = 'solicitudes-negocio'): Promise<string> {
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
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
            filename_override: Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
          },
          (error, result) => {
            if (error || !result) reject(error || new Error('Error al subir a Cloudinary'));
            else resolve(result.secure_url);
          }
        );
        stream.end(buffer);
      });
    }

    const base64 = buffer.toString('base64');
    return 'data:' + file.type + ';base64,' + base64;
  } catch (err) {
    console.error('Error al subir archivo:', err);
    throw new Error('No se pudo procesar el archivo subido.');
  }
}

export async function crearSolicitud(data: {
  businessName: string;
  fullName?: string;
  phone: string;
  address: string;
  email?: string;
  category: string;
  subcategory?: string;
  description: string;
  socialMedia?: any;
  images?: any;
  products?: any;
  planId?: string;
  paymentMethod?: string;
  paymentReference?: string;
  paymentReceiptUrl?: string;
  referralChannel?: string;
  customFieldsData?: any;
  ipAddress?: string;
}): Promise<{ id: string; config: SolicitudFormConfig; whatsappResult: any; whatsappUrl: string }> {
  const db = await getAdminFirestore();
  const config = await getSolicitudConfig();

  if (!config.enabled) {
    throw new Error('El módulo de registro de negocios se encuentra temporalmente desactivado.');
  }

  // 1. Validar Plan en Servidor (precio oficial desde BD)
  const availablePlans = config.plans || DEFAULT_SOLICITUD_CONFIG.plans;
  const chosenPlan = availablePlans.find(p => p.id === data.planId) || availablePlans[0];
  
  const planId = chosenPlan.id;
  const planName = chosenPlan.name;
  const planPrice = Number(chosenPlan.price) || 0;
  const isFree = chosenPlan.isFree || planPrice === 0;

  const paymentStatus: PaymentStatus = isFree ? 'No aplica' : 'Pendiente de pago';
  const paymentMethod = isFree ? 'No aplica (Gratis)' : (data.paymentMethod || 'Por coordinar');

  const now = new Date().toISOString();
  const newDocRef = db.collection(SOLICITUDES_COLLECTION).doc();

  const nuevaSolicitud: SolicitudNegocio = {
    id: newDocRef.id,
    businessName: data.businessName,
    fullName: data.fullName || '',
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
    planId,
    planName,
    planPrice,
    paymentMethod,
    paymentReference: data.paymentReference || '',
    paymentReceiptUrl: data.paymentReceiptUrl || '',
    paymentStatus,
    referralChannel: data.referralChannel || 'Directo',
    internalNotes: [],
    customFieldsData: data.customFieldsData || {},
    whatsappStatus: 'pending',
    ipAddress: data.ipAddress || '',
    createdAt: now,
    updatedAt: now
  };

  await newDocRef.set(nuevaSolicitud);

  // Resumen imágenes
  const imagenesPedidas = [];
  if (data.images?.noLogoCreateForMe) imagenesPedidas.push('Logo');
  if (data.images?.noBannerCreateForMe) imagenesPedidas.push('Banner');
  if (data.products?.noProductsPhotosCreateForMe) imagenesPedidas.push('Fotos de productos');
  const imagenesStr = imagenesPedidas.length > 0 ? imagenesPedidas.join(', ') : 'Ninguna';

  const adminUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://markix.app';
  const panelLink = adminUrl + '/superadmin/solicitudes-negocio?id=' + newDocRef.id;
  const valorStr = planPrice > 0 ? ('$' + planPrice.toLocaleString('es-CO') + ' COP') : 'Gratis';

  // 2. CONSTRUIR CUERPO COMPLETO PARA NOTIFICACIÓN SUPERADMIN (campo body)
  const lineasCuerpo = [
    '========================================',
    'DETALLE COMPLETO DE LA SOLICITUD DE NEGOCIO',
    '========================================',
    '🏢 Negocio: ' + data.businessName,
    '👤 Nombre completo: ' + (data.fullName || 'No registrado'),
    '📞 Teléfono/WhatsApp: ' + data.phone,
    data.email ? '✉️ Correo: ' + data.email : null,
    '📍 Dirección: ' + data.address,
    '🏷️ Categoría: ' + data.category + (data.subcategory ? ' (' + data.subcategory + ')' : ''),
    '📝 Descripción: ' + data.description,
    '',
    '📦 Plan Seleccionado: ' + planName,
    '�� Valor: ' + valorStr,
    '💳 Método de Pago: ' + paymentMethod,
    data.paymentReference ? '🔢 Referencia Pago: ' + data.paymentReference : null,
    data.paymentReceiptUrl ? '🧾 Comprobante de Pago: ' + data.paymentReceiptUrl : null,
    '',
    '🎨 Creación de Recursos solicitada: ' + imagenesStr,
    data.images?.stylePreference ? '✨ Estilo preferido: ' + data.images.stylePreference : null,
    '',
    '--- ENLACES DE ARCHIVOS SUBIDOS ---',
    data.images?.logoUrl ? '🖼️ Logo: ' + data.images.logoUrl : null,
    data.images?.bannerUrl ? '🖼️ Banner: ' + data.images.bannerUrl : null,
    data.products?.templateFileUrl ? '📄 Catálogo: ' + data.products.templateFileUrl : null,
    (data.products?.productPhotosUrls && data.products.productPhotosUrls.length > 0) 
      ? '📸 Fotos (' + data.products.productPhotosUrls.length + '):\n' + data.products.productPhotosUrls.join('\n')
      : null,
    '',
    '🔗 Ver solicitud completa en el panel:',
    panelLink,
    '========================================'
  ].filter(line => line !== null).join('\n');

  try {
    await db.collection('contactMessages').add({
      name: data.businessName,
      email: data.email || 'no-email@markix.app',
      phone: data.phone,
      whatsapp: data.phone,
      subject: 'Nueva Solicitud: ' + data.businessName + ' [' + planName + ']',
      body: lineasCuerpo,
      message: lineasCuerpo,
      solicitudId: newDocRef.id,
      module: 'solicitudes-negocio',
      read: false,
      isResolved: false,
      createdAt: now
    });
  } catch (e) {
    console.error('Error creando notificación superadmin:', e);
  }

  // 3. MENSAJE Y URL DE WHATSAPP AL CLIENTE (https://wa.me/...)
  let targetPhone = (config.adminWhatsAppNumber || '573228831634').replace(/[^0-9]/g, '');
  if (!targetPhone) targetPhone = '573228831634';
  if (targetPhone.length === 10 && !targetPhone.startsWith('57')) {
    targetPhone = '57' + targetPhone;
  }

        const resumenMensajeWa = [
    String.fromCodePoint(0x1F195) + ' *Nueva Solicitud de Negocio - Markix*',
    '',
    String.fromCodePoint(0x1F3EA) + ' *Negocio:* ' + data.businessName,
        String.fromCodePoint(0x1F464) + ' *Nombre completo:* ' + (data.fullName || 'No registrado'),
    String.fromCodePoint(0x1F4DE) + ' *Teléfono:* ' + data.phone,
    String.fromCodePoint(0x1F4CD) + ' *Dirección:* ' + data.address,
    String.fromCodePoint(0x1F3F7) + ' *Categoría:* ' + data.category + (data.subcategory ? ' (' + data.subcategory + ')' : ''),
    data.description ? '📝 *Descripción corta:* ' + data.description : null,
    (() => {
      const sm = data.socialMedia;
      if (!sm) return null;
      const list = [];
      if (sm.instagram) list.push('Instagram: ' + sm.instagram);
      if (sm.facebook) list.push('Facebook: ' + sm.facebook);
      if (sm.tiktok) list.push('TikTok: ' + sm.tiktok);
      if (sm.youtube) list.push('YouTube: ' + sm.youtube);
      return list.length > 0 ? '🌐 *Redes Sociales:* ' + list.join(' | ') : null;
    })(),
    String.fromCodePoint(0x1F4E6) + ' *Plan:* ' + planName + ' (' + valorStr + ')',
    String.fromCodePoint(0x1F4B3) + ' *Pago:* ' + paymentMethod,
    data.paymentReference ? String.fromCodePoint(0x1F522) + ' *Ref Pago:* ' + data.paymentReference : null,
    data.paymentReceiptUrl ? String.fromCodePoint(0x1F9FE) + ' *Comprobante:* ' + data.paymentReceiptUrl : null,
    String.fromCodePoint(0x1F3A8) + ' *Creación imágenes:* ' + imagenesStr,
    data.images?.stylePreference ? '✨ *Estilo preferido:* ' + data.images.stylePreference : null,
    '',
    String.fromCodePoint(0x1F517) + ' *Enlace al Panel:*',
    panelLink
  ].filter(Boolean).join('\n');

  const resumenArray = Array.from(resumenMensajeWa);
  const mensajeFinalWa = resumenArray.length > 1500 
    ? resumenArray.slice(0, 1450).join('') + '\n\n' + String.fromCodePoint(0x1F517) + ' ' + panelLink 
    : resumenMensajeWa;

  const whatsappUrl = 'https://api.whatsapp.com/send/?phone=' + targetPhone + '&text=' + encodeURIComponent(mensajeFinalWa);

  // 4. WHAPI en Servidor (bot interno de alertas)
  let whatsappResult: { success: boolean; whatsappUrl?: string; error?: string } = { success: false, error: 'No configurado' };
  if (config.adminWhatsAppNumber) {
    try {
      whatsappResult = await enviarWhatsAppSolicitud({
        toPhone: targetPhone,
        template: mensajeFinalWa,
        variables: {
          nombre: data.businessName,
          telefono: data.phone,
          categoria: data.category,
          imagenes: imagenesStr,
          enlace: panelLink
        }
      });

      await newDocRef.update({
        whatsappStatus: whatsappResult.success ? 'sent' : 'failed',
        whatsappError: whatsappResult.error || null
      });
    } catch (e: any) {
      console.warn('WHAPI Server-side dispatch warning:', e.message);
    }
  }

  return { id: newDocRef.id, config, whatsappResult, whatsappUrl };
}

export async function reenviarWhatsAppSolicitud(solicitudId: string): Promise<{ success: boolean; error?: string }> {
  const db = await getAdminFirestore();
  const snap = await db.collection(SOLICITUDES_COLLECTION).doc(solicitudId).get();
  if (!snap.exists) return { success: false, error: 'Solicitud no encontrada' };

  const solicitud = snap.data() as SolicitudNegocio;
  const config = await getSolicitudConfig();
  const targetPhone = solicitud.phone || config.adminWhatsAppNumber;
  if (!targetPhone) return { success: false, error: 'La solicitud no cuenta con número de teléfono registrado.' };

  const imagenesPedidas = [];
  if (solicitud.images?.noLogoCreateForMe) imagenesPedidas.push('Logo');
  if (solicitud.images?.noBannerCreateForMe) imagenesPedidas.push('Banner');
  if (solicitud.products?.noProductsPhotosCreateForMe) imagenesPedidas.push('Fotos');
  const imagenesStr = imagenesPedidas.length > 0 ? imagenesPedidas.join(', ') : 'Ninguna';

  const adminUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://markix.app';
  const panelLink = adminUrl + '/superadmin/solicitudes-negocio?id=' + solicitud.id;

  const valorStr = (solicitud.planPrice || 0) > 0 ? '$' + solicitud.planPrice?.toLocaleString('es-CO') + ' COP' : 'Gratis';

  let plantilla = config.whatsappMessageTemplate || DEFAULT_SOLICITUD_CONFIG.whatsappMessageTemplate;
  plantilla = plantilla.replace(/{plan}/g, solicitud.planName || 'N/A');
  plantilla = plantilla.replace(/{valor}/g, valorStr);
  plantilla = plantilla.replace(/{metodo_pago}/g, solicitud.paymentMethod || 'N/A');
  plantilla = plantilla.replace(/{comprobante}/g, solicitud.paymentReceiptUrl ? 'Adjuntado' : 'No');
  plantilla = plantilla.replace(/{estilo}/g, solicitud.images?.stylePreference || 'No especificado');
  plantilla = plantilla.replace(/{estilo_preferido}/g, solicitud.images?.stylePreference || 'No especificado');

  const result = await enviarWhatsAppSolicitud({
    toPhone: targetPhone,
    template: plantilla,
    variables: {
      nombre: solicitud.businessName,
      nombre_completo: solicitud.fullName || 'No registrado',
      telefono: solicitud.phone,
      categoria: solicitud.category,
      imagenes: imagenesStr,
      estilo: solicitud.images?.stylePreference || 'No especificado',
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

export async function getSolicitudes(filtroEstado?: string, filtroPago?: string): Promise<SolicitudNegocio[]> {
  const db = await getAdminFirestore();
  let query = db.collection(SOLICITUDES_COLLECTION);

  let q: any = query;
  if (filtroEstado && filtroEstado !== 'todos') {
    q = q.where('status', '==', filtroEstado);
  }
  if (filtroPago && filtroPago !== 'todos') {
    q = q.where('paymentStatus', '==', filtroPago);
  }

  const snap = await q.orderBy('createdAt', 'desc').get();
  return snap.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() as any) }));
}

export async function actualizarEstadoSolicitud(
  solicitudId: string,
  nuevoEstado: SolicitudEstado,
  nuevoEstadoPago?: PaymentStatus,
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

  const updates: any = {
    status: nuevoEstado,
    internalNotes: notes,
    updatedAt: new Date().toISOString()
  };

  if (nuevoEstadoPago) {
    updates.paymentStatus = nuevoEstadoPago;
  }

  await docRef.update(updates);
}
