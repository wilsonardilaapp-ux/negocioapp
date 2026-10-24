const fs = require('fs');

console.log('==============================================');
console.log('APLICANDO PARTE 1: Tipos, Constantes, Servicio y API');
console.log('==============================================');

function backupAndWrite(filePath, content) {
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, filePath + '.bak');
    console.log('[BACKUP OK] ' + filePath + '.bak');
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[ACTUALIZADO OK] ' + filePath);
}

// 1. types.ts
const typesContent = `export type SolicitudEstado = 
  | 'Recibido'
  | 'En diseño'
  | 'Pendiente de aprobación'
  | 'Cambios solicitados'
  | 'Aprobado'
  | 'Publicado';

export type PaymentStatus = 
  | 'No aplica'
  | 'Pendiente de pago'
  | 'Pagado'
  | 'Rechazado';

export interface PlanActivacion {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'COP';
  isFree: boolean;
  hotmartUrl?: string;
  active: boolean;
  highlighted?: boolean;
}

export interface SolicitudImagenData {
  logoUrl?: string;
  noLogoCreateForMe?: boolean;
  bannerUrl?: string;
  noBannerCreateForMe?: boolean;
  stylePreference?: string;
}

export interface SolicitudProductosData {
  templateFileUrl?: string;
  noProductsPhotosCreateForMe?: boolean;
  productPhotosUrls?: string[];
}

export interface SolicitudRedesSociales {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
}

export interface SolicitudNotaInterna {
  id: string;
  text: string;
  createdAt: string;
  author?: string;
}

export interface SolicitudNegocio {
  id: string;
  businessName: string;
  phone: string;
  address: string;
  email?: string;
  category: string;
  subcategory?: string;
  description: string;
  socialMedia?: SolicitudRedesSociales;
  images?: SolicitudImagenData;
  products?: SolicitudProductosData;
  status: SolicitudEstado;
  internalNotes?: SolicitudNotaInterna[];
  customFieldsData?: Record<string, any>;
  
  planId?: string;
  planName?: string;
  planPrice?: number;
  paymentMethod?: string;
  paymentReference?: string;
  paymentReceiptUrl?: string;
  paymentStatus?: PaymentStatus;
  
  whatsappStatus?: 'pending' | 'sent' | 'failed';
  whatsappError?: string;
  
  ipAddress?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryDefinition {
  name: string;
  subcategories: string[];
}

export interface FormBlockConfig {
  enabled: boolean;
  order: number;
  title: string;
  description: string;
}

export interface SolicitudFormConfig {
  enabled: boolean;
  adminWhatsAppNumber: string;
  backupEmail?: string;
  whatsappMessageTemplate: string;
  confirmationMessage: string;
  branding: {
    title: string;
    subtitle: string;
    primaryColor: string;
    buttonColor: string;
    logoUrl?: string;
  };
  blocks: {
    generalInfo: FormBlockConfig;
    socialMedia: FormBlockConfig;
    brandingImages: FormBlockConfig;
    products: FormBlockConfig;
    plans?: FormBlockConfig;
  };
  plans: PlanActivacion[];
  paymentInstructions?: Record<string, string>;
  categories: CategoryDefinition[];
  customFields: any[];
  version: number;
  updatedAt: string;
}
`;
backupAndWrite('src/modules/solicitudes-negocio/types.ts', typesContent);

// 2. constants.ts
const constantsContent = `import { SolicitudFormConfig, SolicitudEstado } from './types';

export const ESTADOS_SOLICITUD: SolicitudEstado[] = [
  'Recibido',
  'En diseño',
  'Pendiente de aprobación',
  'Cambios solicitados',
  'Aprobado',
  'Publicado'
];

export const ESTADO_COLORES: Record<SolicitudEstado, { bg: string; text: string; border: string }> = {
  'Recibido': { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' },
  'En diseño': { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20' },
  'Pendiente de aprobación': { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' },
  'Cambios solicitados': { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500/20' },
  'Aprobado': { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
  'Publicado': { bg: 'bg-green-600/10', text: 'text-green-600', border: 'border-green-600/20' }
};

export const DEFAULT_PLANS = [
  {
    id: 'plan-gratis',
    name: 'Plan Activación Básica',
    description: 'Ingreso estándar al directorio y menú digital básico',
    price: 0,
    currency: 'COP' as const,
    isFree: true,
    active: true,
    highlighted: false
  },
  {
    id: 'plan-pro',
    name: 'Plan Pro + Menú Interactivo',
    description: 'Catálogo con fotos, pedidos por WhatsApp y posicionamiento en el directorio',
    price: 49000,
    currency: 'COP' as const,
    isFree: false,
    hotmartUrl: '',
    active: true,
    highlighted: true
  },
  {
    id: 'plan-vip',
    name: 'Plan VIP Completo + Diseño',
    description: 'Creación profesional de logo, portada, fotos y configuración total',
    price: 99000,
    currency: 'COP' as const,
    isFree: false,
    hotmartUrl: '',
    active: true,
    highlighted: false
  }
];

export const DEFAULT_SOLICITUD_CONFIG: SolicitudFormConfig = {
  enabled: true,
  adminWhatsAppNumber: '',
  backupEmail: '',
  whatsappMessageTemplate: '🔔 *Nueva Solicitud de Negocio Recibida*\\n\\n' +
    '🏢 *Negocio:* {nombre}\\n' +
    '📞 *Teléfono:* {telefono}\\n' +
    '��️ *Categoría:* {categoria}\\n' +
    '📦 *Plan:* {plan} ({valor})\\n' +
    '💳 *Pago:* {metodo_pago}\\n' +
    '🧾 *Comprobante:* {comprobante}\\n' +
    '🎨 *Creación de imágenes:* {imagenes}\\n\\n' +
    '🔗 *Ver en Panel:* {enlace}',
  confirmationMessage: '¡Gracias! Hemos recibido la información de tu negocio. Nuestro equipo revisará los datos y se pondrá en contacto contigo.',
  branding: {
    title: 'Registra tu Negocio',
    subtitle: 'Completa los datos de tu empresa para incorporarte a nuestra plataforma',
    primaryColor: '#0284c7',
    buttonColor: '#0284c7',
    logoUrl: ''
  },
  blocks: {
    plans: {
      enabled: true,
      order: 1,
      title: 'Planes de Activación',
      description: 'Selecciona el plan adecuado para impulsar tu negocio'
    },
    generalInfo: {
      enabled: true,
      order: 2,
      title: 'Información General',
      description: 'Datos principales para identificar y contactar a tu negocio'
    },
    socialMedia: {
      enabled: true,
      order: 3,
      title: 'Redes Sociales',
      description: 'Canales digitales donde tus clientes te encuentran'
    },
    brandingImages: {
      enabled: true,
      order: 4,
      title: 'Identidad Visual (Logo y Banner)',
      description: 'Sube tus archivos o indícanos si necesitas que diseñemos para ti'
    },
    products: {
      enabled: true,
      order: 5,
      title: 'Catálogo de Productos',
      description: 'Adjunta tu catálogo en plantilla Excel/Word o fotos'
    }
  },
  plans: DEFAULT_PLANS,
  paymentInstructions: {
    nequi: 'Transfiere a Nequi y adjunta tu soporte abajo.',
    bancolombia: 'Transfiere a nuestra cuenta Bancolombia.',
    daviplata: 'Transfiere por Daviplata y carga tu captura.',
    wompi: 'Paga con tarjeta o PSE mediante el checkout oficial.',
    breB: 'Envía tu transferencia a la llave BRE-B indicada.'
  },
  categories: [
    {
      name: 'Restaurantes y Gastronomía',
      subcategories: ['Comida Rápida', 'Cafetería', 'Panadería y Pastelería', 'Restaurante Gourmet', 'Bebidas y Licores']
    },
    {
      name: 'Comercio y Retail',
      subcategories: ['Ropa y Calzado', 'Electrónica', 'Hogar y Muebles', 'Supermercado y Bodega', 'Ferretería']
    },
    {
      name: 'Salud y Belleza',
      subcategories: ['Peluquería y Barbería', 'Spa y Estética', 'Farmacia', 'Consultorio Médico', 'Odontología']
    },
    {
      name: 'Servicios Profesionales',
      subcategories: ['Consultoría', 'Legal', 'Contabilidad', 'Educación y Cursos', 'Tecnología y Software']
    },
    {
      name: 'Otros',
      subcategories: ['General']
    }
  ],
  customFields: [],
  version: 1,
  updatedAt: new Date().toISOString()
};
`;
backupAndWrite('src/modules/solicitudes-negocio/constants.ts', constantsContent);

// 3. solicitudes-service.ts
const solicitudesServiceContent = `import { getAdminFirestore } from '@/firebase/server-init';
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
    return {
      ...DEFAULT_SOLICITUD_CONFIG,
      ...data,
      plans: Array.isArray(data.plans) && data.plans.length > 0 ? data.plans : DEFAULT_SOLICITUD_CONFIG.plans,
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
  customFieldsData?: any;
  ipAddress?: string;
}): Promise<{ id: string; config: SolicitudFormConfig; whatsappResult: any }> {
  const db = await getAdminFirestore();
  const config = await getSolicitudConfig();

  if (!config.enabled) {
    throw new Error('El módulo de registro de negocios se encuentra temporalmente desactivado.');
  }

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
    internalNotes: [],
    customFieldsData: data.customFieldsData || {},
    whatsappStatus: 'pending',
    ipAddress: data.ipAddress || '',
    createdAt: now,
    updatedAt: now
  };

  await newDocRef.set(nuevaSolicitud);

  try {
    await db.collection('contactMessages').add({
      name: data.businessName,
      email: data.email || 'no-email@markix.app',
      phone: data.phone,
      subject: 'Nueva Solicitud: ' + data.businessName + ' [' + planName + ']',
      message: 'Plan: ' + planName + ' (' + (planPrice > 0 ? '$' + planPrice.toLocaleString('es-CO') + ' COP' : 'Gratuito') + '). Pago: ' + paymentMethod + '. Ver en panel.',
      solicitudId: newDocRef.id,
      module: 'solicitudes-negocio',
      read: false,
      isResolved: false,
      createdAt: now
    });
  } catch (e) {
    console.error('Error creando notificación superadmin:', e);
  }

  const imagenesPedidas = [];
  if (data.images?.noLogoCreateForMe) imagenesPedidas.push('Logo');
  if (data.images?.noBannerCreateForMe) imagenesPedidas.push('Banner');
  if (data.products?.noProductsPhotosCreateForMe) imagenesPedidas.push('Fotos');
  const imagenesStr = imagenesPedidas.length > 0 ? imagenesPedidas.join(', ') : 'Ninguna';

  const adminUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://markix.app';
  const panelLink = adminUrl + '/superadmin/solicitudes-negocio?id=' + newDocRef.id;

  const valorStr = planPrice > 0 ? '$' + planPrice.toLocaleString('es-CO') + ' COP' : 'Gratis';
  const comprobanteStr = data.paymentReceiptUrl ? 'Adjuntado (Ver en panel)' : 'No adjuntado';

  let plantilla = config.whatsappMessageTemplate || DEFAULT_SOLICITUD_CONFIG.whatsappMessageTemplate;
  plantilla = plantilla.replace(/{plan}/g, planName);
  plantilla = plantilla.replace(/{valor}/g, valorStr);
  plantilla = plantilla.replace(/{metodo_pago}/g, paymentMethod);
  plantilla = plantilla.replace(/{comprobante}/g, comprobanteStr);

  let whatsappResult = { success: false, error: 'No configurado' };
  if (config.adminWhatsAppNumber) {
    whatsappResult = await enviarWhatsAppSolicitud({
      toPhone: config.adminWhatsAppNumber,
      template: plantilla,
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
  }

  return { id: newDocRef.id, config, whatsappResult };
}

export async function reenviarWhatsAppSolicitud(solicitudId: string): Promise<{ success: boolean; error?: string }> {
  const db = await getAdminFirestore();
  const snap = await db.collection(SOLICITUDES_COLLECTION).doc(solicitudId).get();
  if (!snap.exists) return { success: false, error: 'Solicitud no encontrada' };

  const solicitud = snap.data() as SolicitudNegocio;
  const config = await getSolicitudConfig();
  if (!config.adminWhatsAppNumber) return { success: false, error: 'No hay WhatsApp configurado.' };

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

  const result = await enviarWhatsAppSolicitud({
    toPhone: config.adminWhatsAppNumber,
    template: plantilla,
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
`;
backupAndWrite('src/modules/solicitudes-negocio/services/solicitudes-service.ts', solicitudesServiceContent);

// 4. API /api/solicitudes-negocio/route.ts
const apiRouteContent = `import { NextRequest, NextResponse } from 'next/server';
import { getSolicitudConfig, crearSolicitud, uploadArchivoSeguro } from '@/modules/solicitudes-negocio/services/solicitudes-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getSolicitudConfig();
    return NextResponse.json({
      ...config,
      backupEmail: undefined
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error cargando configuración' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    if (formData.get('_hp_website')) {
      return NextResponse.json({ success: true, message: 'Enviado correctamente' });
    }

    const businessName = String(formData.get('businessName') || '').trim();
    const phone = String(formData.get('phone') || '').trim();
    const address = String(formData.get('address') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const category = String(formData.get('category') || '').trim();
    const subcategory = String(formData.get('subcategory') || '').trim();
    const description = String(formData.get('description') || '').trim();

    if (!businessName || !phone || !address || !category || !description) {
      return NextResponse.json(
        { error: 'Por favor complete todos los campos obligatorios (*)' },
        { status: 400 }
      );
    }

    const planId = String(formData.get('planId') || '').trim();
    const paymentMethod = String(formData.get('paymentMethod') || '').trim();
    const paymentReference = String(formData.get('paymentReference') || '').trim();

    let paymentReceiptUrl = '';
    const receiptFile = formData.get('paymentReceipt') as File | null;
    if (receiptFile && receiptFile.size > 0) {
      if (receiptFile.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'El comprobante excede el límite de 5 MB.' }, { status: 400 });
      }
      paymentReceiptUrl = await uploadArchivoSeguro(receiptFile, 'solicitudes/comprobantes');
    }

    const socialMedia = {
      instagram: String(formData.get('social_instagram') || '').trim(),
      facebook: String(formData.get('social_facebook') || '').trim(),
      tiktok: String(formData.get('social_tiktok') || '').trim(),
      youtube: String(formData.get('social_youtube') || '').trim()
    };

    const noLogoCreateForMe = formData.get('noLogoCreateForMe') === 'true';
    const noBannerCreateForMe = formData.get('noBannerCreateForMe') === 'true';
    const stylePreference = String(formData.get('stylePreference') || '').trim();

    let logoUrl = '';
    const logoFile = formData.get('logoFile') as File | null;
    if (logoFile && logoFile.size > 0 && !noLogoCreateForMe) {
      if (logoFile.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'Logo excede 2 MB' }, { status: 400 });
      logoUrl = await uploadArchivoSeguro(logoFile, 'solicitudes/logos');
    }

    let bannerUrl = '';
    const bannerFile = formData.get('bannerFile') as File | null;
    if (bannerFile && bannerFile.size > 0 && !noBannerCreateForMe) {
      if (bannerFile.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'Banner excede 2 MB' }, { status: 400 });
      bannerUrl = await uploadArchivoSeguro(bannerFile, 'solicitudes/banners');
    }

    const noProductsPhotosCreateForMe = formData.get('noProductsPhotosCreateForMe') === 'true';
    let templateFileUrl = '';
    const templateFile = formData.get('templateFile') as File | null;
    if (templateFile && templateFile.size > 0) {
      if (templateFile.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Catálogo excede 5 MB' }, { status: 400 });
      templateFileUrl = await uploadArchivoSeguro(templateFile, 'solicitudes/plantillas');
    }

    const productPhotosUrls = [];
    const productPhotos = formData.getAll('productPhotos');
    for (const photo of productPhotos) {
      if (photo && photo.size > 0 && productPhotosUrls.length < 18) {
        if (photo.size <= 5 * 1024 * 1024) {
          const url = await uploadArchivoSeguro(photo, 'solicitudes/productos');
          productPhotosUrls.push(url);
        }
      }
    }

    const forwarded = req.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : '127.0.0.1';

    const resultado = await crearSolicitud({
      businessName,
      phone,
      address,
      email,
      category,
      subcategory,
      description,
      planId,
      paymentMethod,
      paymentReference,
      paymentReceiptUrl,
      socialMedia,
      images: { logoUrl, noLogoCreateForMe, bannerUrl, noBannerCreateForMe, stylePreference },
      products: { templateFileUrl, noProductsPhotosCreateForMe, productPhotosUrls },
      ipAddress
    });

    return NextResponse.json({
      success: true,
      solicitudId: resultado.id,
      message: resultado.config.confirmationMessage,
      whatsappStatus: resultado.whatsappResult.success ? 'Enviado' : 'Registrado'
    });

  } catch (error: any) {
    console.error('Error en API solicitudes-negocio:', error);
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
  }
}
`;
backupAndWrite('src/app/api/solicitudes-negocio/route.ts', apiRouteContent);

console.log('==============================================');
console.log('PARTE 1 APLICADA CON ÉXITO');
console.log('==============================================');
