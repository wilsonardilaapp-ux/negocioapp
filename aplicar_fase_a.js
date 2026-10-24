const fs = require('fs');
const path = require('path');

console.log('==============================================');
console.log('APLICANDO FASE A: Estructura, Tipos y Config Base');
console.log('==============================================');

// 1. Crear directorios necesarios
const dirs = [
  'src/modules/solicitudes-negocio',
  'src/modules/solicitudes-negocio/components',
  'src/modules/solicitudes-negocio/services'
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[OK] Directorio creado: ${dir}`);
  } else {
    console.log(`[INFO] Directorio ya existe: ${dir}`);
  }
});

// 2. Crear types.ts
const typesContent = `export type SolicitudEstado = 
  | 'Recibido'
  | 'En diseño'
  | 'Pendiente de aprobación'
  | 'Cambios solicitados'
  | 'Aprobado'
  | 'Publicado';

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
  
  // WhatsApp dispatch status
  whatsappStatus?: 'pending' | 'sent' | 'failed';
  whatsappError?: string;
  
  // Auditoría y protección
  ipAddress?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldDefinition {
  id: string;
  label: string;
  helpText?: string;
  required: boolean;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'textarea' | 'file';
  options?: string[];
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
  enabled: boolean; // Interruptor global del módulo
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
  };
  categories: CategoryDefinition[];
  customFields: CustomFieldDefinition[];
  version: number;
  updatedAt: string;
}
`;

fs.writeFileSync('src/modules/solicitudes-negocio/types.ts', typesContent, 'utf8');
console.log('[OK] Creado: src/modules/solicitudes-negocio/types.ts');

// 3. Crear constants.ts
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

export const DEFAULT_SOLICITUD_CONFIG: SolicitudFormConfig = {
  enabled: true,
  adminWhatsAppNumber: '',
  backupEmail: '',
  whatsappMessageTemplate: '🔔 *Nueva Solicitud de Negocio Recibida*\\n\\n' +
    '🏢 *Negocio:* {nombre}\\n' +
    '📞 *Teléfono:* {telefono}\\n' +
    '🏷️ *Categoría:* {categoria}\\n' +
    '🎨 *Creación de imágenes:* {imagenes}\\n\\n' +
    '🔗 *Ver en Panel:* {enlace}',
  confirmationMessage: '¡Gracias! Hemos recibido la información de tu negocio. Nuestro equipo revisará los datos y se pondrá en contacto contigo a la brevedad.',
  branding: {
    title: 'Registra tu Negocio',
    subtitle: 'Completa los datos de tu empresa para incorporarte a nuestra plataforma',
    primaryColor: '#0284c7',
    buttonColor: '#0284c7',
    logoUrl: ''
  },
  blocks: {
    generalInfo: {
      enabled: true,
      order: 1,
      title: 'Información General',
      description: 'Datos principales para identificar y contactar a tu negocio'
    },
    socialMedia: {
      enabled: true,
      order: 2,
      title: 'Redes Sociales',
      description: 'Canales digitales donde tus clientes te encuentran'
    },
    brandingImages: {
      enabled: true,
      order: 3,
      title: 'Identidad Visual (Logo y Banner)',
      description: 'Sube tus archivos o indícanos si necesitas que diseñemos para ti'
    },
    products: {
      enabled: true,
      order: 4,
      title: 'Catálogo de Productos',
      description: 'Adjunta tu catálogo en plantilla Excel/Word o fotos'
    }
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

fs.writeFileSync('src/modules/solicitudes-negocio/constants.ts', constantsContent, 'utf8');
console.log('[OK] Creado: src/modules/solicitudes-negocio/constants.ts');

console.log('\n==============================================');
console.log('FASE A COMPLETADA CON ÉXITO');
console.log('==============================================');
