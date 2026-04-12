import LandingPageContent from '@/components/landing-page/landing-page-content';
import type { LandingPageData } from '@/models/landing-page';
import { v4 as uuidv4 } from 'uuid';
import { unstable_noStore as noStore } from 'next/cache';
import { getAdminFirestore } from "@/firebase/server-init";
import type { SubscriptionPlan } from '@/models/subscription-plan';

// Forzamos comportamiento dinámico total
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

async function getPlans(): Promise<SubscriptionPlan[]> {
  try {
    const db = await getAdminFirestore();
    const q = db.collection("plans").orderBy("price", "asc");
    const snapshot = await q.get();
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as SubscriptionPlan[];
  } catch (error) {
    console.error("Error fetching plans for public page:", error);
    return [];
  }
}

const fallbackData: LandingPageData = {
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
    logoAlt: 'Logo de Mi Negocio',
    logoWidth: 120,
    logoAlignment: 'left',
    businessName: 'Mi Negocio',
    links: [
      { id: 'nav-link-1', text: 'Inicio', url: '#', openInNewTab: false, enabled: true },
      { id: 'nav-link-2', text: 'Servicios', url: '#', openInNewTab: false, enabled: true },
      { id: 'nav-link-3', text: 'Contacto', url: '#', openInNewTab: false, enabled: true },
      { id: 'nav-link-4', text: 'Catálogo', url: '#', openInNewTab: false, enabled: true },
      { id: 'nav-link-5', text: 'Blog', url: '#', openInNewTab: false, enabled: true },
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
        { id: 'form-field-1', label: 'Nombre Completo', type: 'text', placeholder: 'ej. Juan Pérez', required: true },
        { id: 'form-field-2', label: 'Correo Electrónico', type: 'email', placeholder: 'ej. juan.perez@correo.com', required: true },
        { id: 'form-field-3', label: 'WhatsApp', type: 'tel', placeholder: 'ej. 3001234567', required: false },
        { id: 'form-field-4', label: 'Mensaje', type: 'textarea', placeholder: 'Escribe tu consulta aquí...', required: true },
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

export default async function RootPage() {
  noStore();

  try {
    const plans = await getPlans();
    const dataToRender = { ...fallbackData };

    return (
      <main className="w-full">
        <LandingPageContent data={dataToRender} plans={plans} />
      </main>
    );
  } catch (error) {
      console.error("Error en Home:", error);
      return (
        <main className="w-full">
            <LandingPageContent data={fallbackData} plans={[]} />
        </main>
      );
  }
}
