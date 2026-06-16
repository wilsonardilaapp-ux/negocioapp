import LandingPageContent from '../components/landing-page/landing-page-content';
import type { LandingPageData } from '../models/landing-page';
import { getAdminFirestore } from "../firebase/server-init";
import type { SubscriptionPlan } from '../models/subscription-plan';
import { DefaultSubscriptionPlans } from '../models/subscription-plan';
import type { HybridPlan } from '../models/hybrid-plan';
import { getLandingData } from '../lib/get-landing-data';

// Forzamos comportamiento dinámico total y desactivamos el caché
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getPlans(): Promise<SubscriptionPlan[]> {
  try {
    const db = await getAdminFirestore();
    // Obtenemos todos ordenados por precio
    const q = db.collection("plans").orderBy("price", "asc");
    const snapshot = await q.get();
    
    if (snapshot.empty) {
        // Devolvemos array vacío para permitir que los planes híbridos tomen el control
        return [];
    }
    
    // Filtramos en memoria para asegurar que solo se muestren los activos
    return snapshot.docs
      .map(doc => ({ ...doc.data(), id: doc.id } as SubscriptionPlan))
      .filter(plan => plan.isActive === true);
  } catch (error) {
    console.error("Error fetching standard plans for public page:", error);
    return [];
  }
}

async function getHybridPlans(): Promise<HybridPlan[]> {
  try {
    const db = await getAdminFirestore();
    const snapshot = await db.collection("hybrid_plans").get();
    if (snapshot.empty) {
      console.log("No hybrid plans found in DB.");
      return [];
    }
    return snapshot.docs
      .map(doc => ({ ...doc.data(), id: doc.id } as HybridPlan))
      .sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));
  } catch (error) {
    console.error("Error fetching hybrid plans:", error);
    return [];
  }
}

async function getMainBusinessId(): Promise<string | null> {
    try {
        const db = await getAdminFirestore();
        const configSnap = await db.collection("globalConfig").doc("system").get();
        return configSnap.exists ? configSnap.data()?.mainBusinessId : null;
    } catch (error) {
        return null;
    }
}

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

export default async function RootPage() {
  try {
    const results = await Promise.allSettled([
      getLandingData(), 
      getPlans(), 
      getHybridPlans(),
      getMainBusinessId()
    ]);
    
    const landingData = results[0].status === 'fulfilled' ? results[0].value : null;
    let plans = results[1].status === 'fulfilled' ? (results[1].value || []) : [];
    const hybridPlans = results[2].status === 'fulfilled' ? (results[2].value || []) : [];
    const mainBusinessId = results[3].status === 'fulfilled' ? results[3].value : null;
    
    const dataToRender = landingData || fallbackData;

    // Fallback: Solo si NO hay planes reales de ningún tipo, mostramos los de simulación
    if (plans.length === 0 && hybridPlans.length === 0) {
        plans = DefaultSubscriptionPlans;
    }

    return (
      <main className="w-full">
        <LandingPageContent 
          data={dataToRender} 
          plans={plans} 
          hybridPlans={hybridPlans} 
          businessId={mainBusinessId || undefined}
        />
      </main>
    );
  } catch (error) {
      console.error("Critical error rendering Home:", error);
      return (
        <main className="w-full">
            <LandingPageContent data={fallbackData} plans={DefaultSubscriptionPlans} hybridPlans={[]} />
        </main>
      );
  }
}
