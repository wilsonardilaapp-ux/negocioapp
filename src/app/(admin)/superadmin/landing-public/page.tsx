
import { getLandingData } from '../../../../lib/get-landing-data';
import LandingEditorClient from './EditorClient';
import type { LandingPageData } from '../../../../models/landing-page';

export const dynamic = 'force-dynamic';

const fallbackData: LandingPageData = {
  hero: {
    title: 'Zentry: La plataforma integral para tu éxito digital',
    subtitle: 'Todo lo que tu negocio necesita en un solo lugar',
    additionalContent: '<p><strong>Zentry</strong> es el aliado tecnológico definitivo para tu transformación digital. Nuestra plataforma centraliza catálogos inteligentes, blogs profesionales, motores de sugerencias con IA y una gestión de pedidos optimizada para que puedas escalar tu negocio sin límites.</p>',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2026&auto=format&fit=crop',
    ctaButtonText: 'Ver Planes y Precios',
    ctaButtonUrl: '#precios',
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    buttonColor: '#4CAF50',
  },
  navigation: {
    enabled: true,
    logoUrl: '',
    logoAlt: 'Logo Zentry',
    logoWidth: 120,
    logoAlignment: 'left',
    businessName: 'Zentry',
    links: [
      { id: 'nav-link-1', text: 'Inicio', url: '/', openInNewTab: false, enabled: true },
      { id: 'nav-link-2', text: 'Planes', url: '#precios', openInNewTab: false, enabled: true },
      { id: 'nav-link-3', text: 'Servicios', url: '/servicios', openInNewTab: false, enabled: true },
      { id: 'nav-link-4', text: 'Contacto', url: '/contact', openInNewTab: false, enabled: true },
      { id: 'nav-link-5', text: 'Iniciar Sesión', url: '/login', openInNewTab: false, enabled: true },
    ],
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    hoverColor: '#4CAF50',
    fontSize: 16,
    spacing: 4,
    useShadow: true,
  },
  sections: [],
  testimonials: [],
  seo: {
    title: 'Zentry | Plataforma SaaS de Gestión Empresarial',
    description: 'Centraliza y automatiza tu negocio con Zentry. Catálogos, IA, Blog y más.',
    keywords: ['zentry', 'saas', 'gestión', 'negocio', 'catálogo'],
  },
  form: {
    fields: [
        { id: 'form-field-1', label: 'Nombre Completo', type: 'text', placeholder: 'ej. Juan Pérez', required: true },
        { id: 'form-field-2', label: 'Correo Electrónico', type: 'email', placeholder: 'ej. juan.perez@correo.com', required: true },
        { id: 'form-field-3', label: 'WhatsApp', type: 'tel', placeholder: 'ej. 3228831634', required: false },
        { id: 'form-field-4', label: 'Mensaje', type: 'textarea', placeholder: 'Escribe tu consulta aquí...', required: true },
    ],
    destinationEmail: 'allseosoporte@gmail.com',
  },
  header: {
    banner: {
      mediaUrl: null,
      mediaType: null,
    },
    businessInfo: {
      name: 'Zentry Platform',
      address: 'Soporte Global Online',
      phone: '3228831634',
      email: 'allseosoporte@gmail.com',
    },
    socialLinks: {
      tiktok: '',
      instagram: '',
      facebook: '',
      whatsapp: '',
      twitter: '',
      youtube: '',
    },
    carouselItems: [
      { id: 'item-1', mediaUrl: null, mediaType: null, slogan: '' },
      { id: 'item-2', mediaUrl: null, mediaType: null, slogan: '' },
      { id: 'item-3', mediaUrl: null, mediaType: null, slogan: '' },
    ],
  },
  footer: {
    enabled: true,
    contactInfo: {
      address: 'Central de Operaciones Zentry',
      phone: '3228831634',
      email: 'allseosoporte@gmail.com',
      hours: 'Lunes a Viernes, 9am - 6pm',
    },
    quickLinks: [
      { id: 'ql-1', text: 'Inicio', url: '/' },
      { id: 'ql-2', text: 'Sobre nosotros', url: '/sobre-nosotros' },
      { id: 'ql-3', text: 'Servicios', url: '/servicios' },
      { id: 'ql-4', text: 'Planes', url: '/pricing' },
      { id: 'ql-5', text: 'Contacto', url: '/contact' },
    ],
    legalLinks: {
      privacyPolicyUrl: '/politica-de-privacidad',
      termsAndConditionsUrl: '/terminos-y-condiciones',
      cookiesPolicyUrl: '#',
      legalNoticeUrl: '#',
    },
    socialLinks: {
      facebookUrl: '',
      instagramUrl: '',
      tiktokUrl: '',
      youtubeUrl: '',
      linkedinUrl: '',
      showIcons: true,
    },
    logo: {
      url: null,
      slogan: 'Tu negocio, sin límites.',
    },
    certifications: [],
    copyright: {
      companyName: 'Zentry',
      additionalText: 'Todos los derechos reservados.',
    },
    cta: {
      text: '¡Empieza Ahora!',
      url: '/register',
      enabled: true,
    },
    visuals: {
      backgroundImageUrl: null,
      opacity: 80,
      backgroundColor: '#f8f9fa',
      textColor: '#6c757d',
      darkMode: false,
      showBackToTop: true,
    },
    adminExtras: {
      systemVersion: '1.2.0',
      supportLink: '#',
      documentationLink: '#',
    },
  },
};

export default async function Page() {
  const data = await getLandingData();
  const initialData = (data as LandingPageData) || fallbackData;

  return (
    <LandingEditorClient 
      key={JSON.stringify(initialData?.updatedAt || 'initial')} 
      initialData={initialData} 
    />
  );
}
