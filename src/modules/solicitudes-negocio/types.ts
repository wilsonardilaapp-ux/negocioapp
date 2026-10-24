export type SolicitudEstado = 
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
  badge?: string;
  priceSuffix?: string;
  features?: string[];
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
  fullName?: string;
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
  referralChannel?: string;
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
  commissionPercentage?: string;
  showCommissionNote?: boolean;
  categories: CategoryDefinition[];
  customFields: any[];
  version: number;
  updatedAt: string;
}
