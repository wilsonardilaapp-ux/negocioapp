
import LandingPageContent from '../components/landing-page/landing-page-content';
import type { LandingPageData } from '../models/landing-page';
import { getAdminFirestore } from "../firebase/server-init";
import type { SubscriptionPlan } from '../models/subscription-plan';
import { DefaultSubscriptionPlans } from '../models/subscription-plan';
import type { HybridPlan } from '../models/hybrid-plan';
import { getLandingData } from '../lib/get-landing-data';
import FaviconInjector from '@/components/layout/FaviconInjector';

// Forzamos comportamiento dinámico total y desactivamos el caché
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getPlans(): Promise<SubscriptionPlan[]> {
  try {
    const db = await getAdminFirestore();
    const q = db.collection("plans").orderBy("price", "asc");
    const snapshot = await q.get();
    
    if (snapshot.empty) return [];
    
    return snapshot.docs
      .map(doc => ({ ...doc.data(), id: doc.id } as SubscriptionPlan))
      .filter(plan => plan.isActive === true);
  } catch (error) {
    console.error("Error fetching standard plans:", error);
    return [];
  }
}

async function getHybridPlans(): Promise<HybridPlan[]> {
  try {
    const db = await getAdminFirestore();
    const snapshot = await db.collection("hybrid_plans").get();
    if (snapshot.empty) return [];
    return snapshot.docs
      .map(doc => ({ ...doc.data(), id: doc.id } as HybridPlan))
      .sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));
  } catch (error) {
    console.error("Error fetching hybrid plans:", error);
    return [];
  }
}

async function getMainBusinessData(): Promise<{ id: string | null, data: any | null }> {
    try {
        const db = await getAdminFirestore();
        const configSnap = await db.collection("globalConfig").doc("system").get();
        const mainBusinessId = configSnap.exists ? configSnap.data()?.mainBusinessId : null;

        if (mainBusinessId) {
            const bSnap = await db.collection("businesses").doc(mainBusinessId).get();
            return { 
                id: mainBusinessId, 
                data: bSnap.exists ? bSnap.data() : null 
            };
        }
        return { id: null, data: null };
    } catch (error) {
        return { id: null, data: null };
    }
}

const fallbackData: LandingPageData = {
  hero: {
    title: 'Markix: La plataforma integral para tu éxito digital',
    subtitle: 'Todo lo que tu negocio necesita en un solo lugar',
    additionalContent: '<p><strong>Markix</strong> es el aliado tecnológico definitivo para tu transformación digital.</p>',
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
    logoAlt: 'Logo Markix',
    logoWidth: 120,
    logoAlignment: 'left',
    businessName: 'Markix',
    links: [
      { id: 'nav-link-1', text: 'Inicio', url: '/', openInNewTab: false, enabled: true },
      { id: 'nav-link-2', text: 'Planes', url: '#precios', openInNewTab: false, enabled: true },
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
  plans: [],
  seo: {
    title: 'Markix | Plataforma SaaS de Gestión Empresarial',
    description: 'Centraliza y automatiza tu negocio con Markix.',
    keywords: ['markix', 'saas', 'gestión'],
  },
  form: {
    fields: [
        { id: 'form-field-1', label: 'Nombre Completo', type: 'text', placeholder: 'ej. Juan Pérez', required: true },
        { id: 'form-field-2', label: 'Correo Electrónico', type: 'email', placeholder: 'ej. juan.perez@correo.com', required: true },
    ],
    destinationEmail: 'contacto@markix.com',
  },
  header: {
    banner: { mediaUrl: null, mediaType: null },
    businessInfo: { name: 'Markix Platform', address: 'Soporte Global', phone: '3228831634' },
    socialLinks: { tiktok: '', instagram: '', facebook: '', whatsapp: '', twitter: '', youtube: '' },
    carouselItems: [],
  },
  footer: {
    enabled: true,
    contactInfo: { address: 'Central Markix', phone: '3228831634', email: 'contacto@markix.com', hours: 'L-V, 9am - 6pm' },
    quickLinks: [{ id: 'ql-1', text: 'Inicio', url: '/' }],
    legalLinks: { privacyPolicyUrl: '/politica-de-privacidad', termsAndConditionsUrl: '/terminos-y-condiciones', cookiesPolicyUrl: '#', legalNoticeUrl: '#' },
    socialLinks: { facebookUrl: '', instagramUrl: '', tiktokUrl: '', youtubeUrl: '', linkedinUrl: '', showIcons: true },
    logo: { url: null, slogan: 'Tu negocio, sin límites.' },
    certifications: [],
    copyright: { companyName: 'Markix', additionalText: 'Todos los derechos reservados.' },
    cta: { text: '¡Empieza Ahora!', url: '/register', enabled: true },
    visuals: { backgroundImageUrl: null, opacity: 80, backgroundColor: '#f8f9fa', textColor: '#6c757d', darkMode: false, showBackToTop: true },
    adminExtras: { systemVersion: '1.2.0', supportLink: '#', documentationLink: '#' },
  },
};

export default async function RootPage() {
  try {
    const results = await Promise.allSettled([
      getLandingData(), 
      getPlans(), 
      getHybridPlans(),
      getMainBusinessData()
    ]);
    
    const landingData = results[0].status === 'fulfilled' ? (results[0].value || null) : null;
    let plansData = results[1].status === 'fulfilled' ? (results[1].value || []) : [];
    const hybridPlansData = results[2].status === 'fulfilled' ? (results[2].value || []) : [];
    const mainBusiness = results[3].status === 'fulfilled' ? (results[3].value || { id: null, data: null }) : { id: null, data: null };
    
    const dataToRender = landingData || fallbackData;

    if (plansData.length === 0 && hybridPlansData.length === 0) {
        plansData = DefaultSubscriptionPlans;
    }

    const faviconUrl = mainBusiness.data?.faviconUrl || mainBusiness.data?.logoURL || null;
    const siteTitle = mainBusiness.data?.name || "Markix Platform";

    return (
      <main className="w-full">
        <FaviconInjector faviconUrl={faviconUrl} title={siteTitle} />
        <LandingPageContent 
          data={dataToRender} 
          plans={plansData} 
          hybridPlans={hybridPlansData} 
          businessId={mainBusiness.id || undefined}
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
