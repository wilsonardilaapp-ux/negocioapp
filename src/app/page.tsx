
import LandingPageContent from '@/components/landing-page/landing-page-content';
import type { LandingPageData } from '@/models/landing-page';
import { getAdminFirestore } from "@/firebase/server-init";
import type { SubscriptionPlan } from '@/models/subscription-plan';
import { DefaultSubscriptionPlans } from '@/models/subscription-plan';
import type { HybridPlan } from '@/models/hybrid-plan';
import { getLandingData } from '@/lib/get-landing-data';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Obtiene los datos del negocio principal de forma segura.
 */
async function getMainBusinessData() {
  try {
    const db = await getAdminFirestore();
    const configSnap = await db.collection("globalConfig").doc("system").get();
    if (configSnap.exists) {
        const mainBusinessId = configSnap.data()?.mainBusinessId;
        if (mainBusinessId) {
            const bSnap = await db.collection("businesses").doc(mainBusinessId).get();
            return { 
                id: mainBusinessId, 
                data: bSnap.exists ? bSnap.data() : null 
            };
        }
    }
  } catch (error) {
    console.error("[getMainBusinessData] Error:", error);
  }
  return { id: null, data: null };
}

/**
 * Generación de metadatos nativa para evitar errores de Soft 404.
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const { data: business } = await getMainBusinessData();
    const siteTitle = business?.name || "Markix Platform";
    const faviconUrl = business?.faviconUrl || business?.logoURL || '/favicon.ico';

    return {
      title: siteTitle,
      description: business?.description || "Centraliza y automatiza tu negocio con Markix.",
      icons: {
        icon: [{ url: faviconUrl }],
        apple: faviconUrl,
      }
    };
  } catch (e) {
    return {
      title: "Markix Platform",
      description: "Centraliza y automatiza tu negocio con Markix."
    };
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
    adminExtras: { systemVersion: '1.0.0', supportLink: '#', documentationLink: '#' },
  },
};

async function getPlans(): Promise<SubscriptionPlan[]> {
  try {
    const db = await getAdminFirestore();
    const snapshot = await db.collection("plans").orderBy("price", "asc").get();
    if (snapshot.empty) return [];
    return snapshot.docs
      .map(doc => ({ ...doc.data(), id: doc.id } as SubscriptionPlan))
      .filter(plan => plan.isActive === true);
  } catch (e) { return []; }
}

async function getHybridPlans(): Promise<HybridPlan[]> {
  try {
    const db = await getAdminFirestore();
    const snapshot = await db.collection("hybrid_plans").get();
    if (snapshot.empty) return [];
    return snapshot.docs
      .map(doc => ({ ...doc.data(), id: doc.id } as HybridPlan))
      .sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));
  } catch (e) { return []; }
}

export default async function RootPage() {
  let landingData: LandingPageData | null = null;
  let plansData: SubscriptionPlan[] = [];
  let hybridPlansData: HybridPlan[] = [];
  let mainBusiness: { id: string | null; data: any } = { id: null, data: null };

  try {
    const results = await Promise.allSettled([
      getLandingData(),
      getPlans(),
      getHybridPlans(),
      getMainBusinessData()
    ]);
    
    if (results[0].status === 'fulfilled') landingData = results[0].value;
    if (results[1].status === 'fulfilled') plansData = results[1].value;
    if (results[2].status === 'fulfilled') hybridPlansData = results[2].value;
    if (results[3].status === 'fulfilled') mainBusiness = results[3].value;

    if (plansData.length === 0 && hybridPlansData.length === 0) {
        plansData = DefaultSubscriptionPlans;
    }

    const dataToRender = landingData || fallbackData;

    return (
      <main className="w-full">
        <LandingPageContent 
          data={dataToRender} 
          plans={plansData} 
          hybridPlans={hybridPlansData} 
          businessId={mainBusiness.id || undefined}
          showPlatformPlans={true}
        />
      </main>
    );
  } catch (error) {
    console.error("Critical error in RootPage:", error);
    return (
      <main className="w-full">
          <LandingPageContent data={fallbackData} plans={DefaultSubscriptionPlans} hybridPlans={[]} showPlatformPlans={true} />
      </main>
    );
  }
}
