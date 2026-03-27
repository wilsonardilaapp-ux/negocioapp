'use server';

import { LandingPageEditor } from './editor';
import type { LandingPageData } from '@/models/landing-page';
import { v4 as uuidv4 } from 'uuid';
import { getLandingConfig } from '@/actions/save-landing-config';

const initialLandingData: LandingPageData = {
  hero: {
    title: 'Innovación que impulsa tu negocio al futuro',
    subtitle: 'Transformamos tecnología en crecimiento real',
    additionalContent: '<p>En <strong>PS-USER</strong>, combinamos innovación, estrategia y tecnología para impulsar la transformación digital de tu negocio. Desarrollamos soluciones inteligentes en software, automatización, inteligencia artificial y presencia digital que optimizan tus procesos y potencian tus resultados. Nuestro equipo experto te acompaña en cada paso, desde la planificación hasta la implementación, garantizando eficiencia, seguridad y crecimiento sostenible. Conviértete en una empresa más ágil, competitiva y conectada con el futuro. <strong>PS-USER</strong>, tu aliado tecnológico para alcanzar el éxito en la era digital.</p>',
    imageUrl: 'https://images.unsplash.com/photo-1588656909074-a9ff6d608eb9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw4fHxuYXR1cmUlMjB3ZWxsbmVzc3xlbnwwfHx8fDE3NjIyMjAxMzN8MA&ixlib=rb-4.1.0&q=80&w=1080',
    ctaButtonText: 'Contáctanos',
    ctaButtonUrl: '#contact',
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    buttonColor: '#4CAF50',
  },
  navigation: {
    enabled: true,
    logoUrl: '',
    businessName: 'Mi Negocio',
    logoAlt: 'Logo de Mi Negocio',
    logoWidth: 120,
    logoAlignment: 'left',
    links: [
      { id: uuidv4(), text: 'Inicio', url: '#', openInNewTab: false, enabled: true },
      { id: uuidv4(), text: 'Servicios', url: '#', openInNewTab: false, enabled: true },
      { id: uuidv4(), text: 'Contacto', url: '#', openInNewTab: false, enabled: true },
      { id: uuidv4(), text: 'Catálogo', url: '#', openInNewTab: false, enabled: true },
      { id: uuidv4(), text: 'Blog', url: '#', openInNewTab: false, enabled: true },
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
    title: 'Mi Negocio | Soluciones Innovadoras',
    description: 'Ofrecemos soluciones innovadoras para impulsar tu negocio al siguiente nivel.',
    keywords: ['innovación', 'tecnología', 'negocio'],
  },
  form: {
    fields: [
        { id: uuidv4(), label: 'Nombre Completo', type: 'text', placeholder: 'ej. Juan Pérez', required: true },
        { id: uuidv4(), label: 'Correo Electrónico', type: 'email', placeholder: 'ej. juan.perez@correo.com', required: true },
        { id: uuidv4(), label: 'WhatsApp', type: 'tel', placeholder: 'ej. 3001234567', required: false },
        { id: uuidv4(), label: 'Mensaje', type: 'textarea', placeholder: 'Escribe tu consulta aquí...', required: true },
    ],
    destinationEmail: '',
  },
  header: {
    banner: {
      mediaUrl: null,
      mediaType: null,
    },
    businessInfo: {
      name: 'Tu Negocio',
      address: 'Calle Falsa 123',
      phone: '+57 300 123 4567',
      email: 'info@tunegocio.com',
    },
    socialLinks: {
      tiktok: '',
      instagram: '',
      facebook: '',
      whatsapp: '',
      twitter: '',
    },
    carouselItems: [
      { id: uuidv4(), mediaUrl: null, mediaType: null, slogan: '' },
      { id: uuidv4(), mediaUrl: null, mediaType: null, slogan: '' },
      { id: uuidv4(), mediaUrl: null, mediaType: null, slogan: '' },
    ],
  },
  footer: {
    enabled: true,
    contactInfo: {
      address: 'Calle Falsa 123, Ciudad, País',
      phone: '+57 300 123 4567',
      email: 'contacto@empresa.com',
      hours: 'Lunes a Viernes, 9am - 6pm',
    },
    quickLinks: [
      { id: uuidv4(), text: 'Inicio', url: '#' },
      { id: uuidv4(), text: 'Sobre nosotros', url: '#' },
      { id: uuidv4(), text: 'Servicios', url: '#' },
      { id: uuidv4(), text: 'Blog', url: '#' },
      { id: uuidv4(), text: 'Contacto', url: '#' },
      { id: uuidv4(), text: 'FAQ', url: '#' },
    ],
    legalLinks: {
      privacyPolicyUrl: '#',
      termsAndConditionsUrl: '#',
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
      slogan: 'Tu slogan aquí',
    },
    certifications: [],
    copyright: {
      companyName: 'Tu Empresa',
      additionalText: 'Todos los derechos reservados.',
    },
    cta: {
      text: '¡Empieza Ahora!',
      url: '#',
      enabled: false,
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
      systemVersion: '1.0.0',
      supportLink: '#',
      documentationLink: '#',
    },
  },
};


// A deep merge function to safely combine initial data with fetched data.
function deepMerge(target: any, source: any): any {
    const output = { ...target };
    if (target && typeof target === 'object' && source && typeof source === 'object') {
        Object.keys(source).forEach(key => {
            if (source[key] && typeof source[key] === 'object' && key in target && typeof target[key] === 'object' && !Array.isArray(source[key])) {
                output[key] = deepMerge(target[key], source[key]);
            } else {
                output[key] = source[key];
            }
        });
        // Ensure all keys from the target are in the output, even if not in the source
        Object.keys(target).forEach(key => {
            if (!(key in source)) {
                output[key] = target[key];
            }
        });
    }
    return output;
}


export default async function SuperAdminPublicLandingPage() {
    // This server component now reliably fetches data using the Admin SDK via a server action.
    const fetchedData = await getLandingConfig();
    
    // Merge fetched data with initial data to ensure all fields are present and avoid runtime errors.
    const data = deepMerge(initialLandingData, fetchedData);
    
    // Pass the confirmed data to the client component for editing.
    return <LandingPageEditor initialData={data} />;
}
