
import { getLandingConfig } from '@/actions/save-landing-config';
import type { LandingPageData } from '@/models/landing-page';
import LandingPageContent from '@/components/landing-page/landing-page-content';
import { ChatbotWidget } from '@/components/chatbot/chatbot-widget';
import { getAdminFirestore } from '@/firebase/server-init';
import { doc, getDoc } from 'firebase/firestore';
import { Frown } from 'lucide-react';
import type { Module } from '@/models/module';

// Fallback data structure for when database fetch fails
const fallbackData: LandingPageData = {
  hero: {
    title: 'Bienvenido a Nuestra Plataforma',
    subtitle: 'Estamos preparando algo increíble para ti. Vuelve pronto.',
    additionalContent: '',
    imageUrl: null, 
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    buttonColor: '#4CAF50',
    ctaButtonText: 'Contáctanos',
    ctaButtonUrl: '#contact'
  },
  navigation: { enabled: true, logoUrl: '', businessName: 'Negocio V03', logoAlt: 'Logo', logoWidth: 120, logoAlignment: 'left', links: [], backgroundColor: '#FFFFFF', textColor: '#000000', hoverColor: '#4CAF50', fontSize: 16, spacing: 4, useShadow: true },
  sections: [], 
  testimonials: [], 
  seo: { title: 'Página en Construcción', description: '', keywords: [] }, 
  form: { fields: [], destinationEmail: '' }, 
  header: { 
    banner: { mediaUrl: null, mediaType: null }, 
    businessInfo: { name: '', address: '', phone: '', email: '' }, 
    socialLinks: { tiktok: '', instagram: '', facebook: '', whatsapp: '', twitter: '' }, 
    carouselItems: []
  },
  footer: { enabled: true, contactInfo: { address: '', phone: '', email: '', hours: '' }, quickLinks: [], legalLinks: { privacyPolicyUrl: '', termsAndConditionsUrl: '', cookiesPolicyUrl: '', legalNoticeUrl: '' }, socialLinks: { facebookUrl: '', instagramUrl: '', tiktokUrl: '', youtubeUrl: '', linkedinUrl: '', showIcons: true }, logo: { url: null, slogan: '' }, certifications: [], copyright: { companyName: '', additionalText: '' }, cta: { text: '', url: '', enabled: false }, visuals: { backgroundImageUrl: null, opacity: 80, backgroundColor: '#FFFFFF', textColor: '#000000', darkMode: false, showBackToTop: true }, adminExtras: { systemVersion: '1.0.0', supportLink: '', documentationLink: '' } },
};

async function getGlobalConfig() {
    try {
        const firestore = await getAdminFirestore();
        const configDocRef = doc(firestore, 'globalConfig/system');
        const chatbotModuleRef = doc(firestore, 'modules/chatbot-integrado-con-whatsapp-para-soporte-y-ventas');

        const [configSnap, chatbotModuleSnap] = await Promise.all([
            configDocRef.get(),
            chatbotModuleRef.get()
        ]);
        
        const businessId = configSnap.exists() ? configSnap.data()?.mainBusinessId : null;
        const chatbotModule = chatbotModuleSnap.exists() ? chatbotModuleSnap.data() as Module : null;
        
        return { businessId, chatbotModule };

    } catch (error) {
        console.error("Error fetching global config on server:", error);
        return { businessId: null, chatbotModule: null };
    }
}

export default async function RootPage() {
    // Await all server-side data fetching
    const landingData = await getLandingConfig();
    const { businessId, chatbotModule } = await getGlobalConfig();

    const dataToRender = landingData ?? fallbackData;
    const isChatbotEnabled = chatbotModule?.status === 'active';

    if (!landingData) {
        console.warn("Could not fetch landing page data from server. Using fallback data.");
    }
    
    if (!businessId) {
       return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center px-4">
                <Frown className="h-16 w-16 text-muted-foreground mb-4" />
                <h1 className="text-2xl font-bold">Página de Inicio no Configurada</h1>
                <p className="text-muted-foreground mt-2 max-w-md">
                    El administrador aún no ha asignado un negocio principal para mostrar en la página de inicio.
                </p>
            </div>
        );
    }
    
    return (
        <div className="w-full bg-background">
            <LandingPageContent data={dataToRender} businessId={businessId} />
            
            {isChatbotEnabled && (
                 <ChatbotWidget 
                    enabled={isChatbotEnabled}
                    businessId={businessId}
                    businessName={dataToRender.header?.businessInfo?.name || 'Asistente'}
                    avatarUrl={dataToRender.chatbot?.avatarUrl || ''}
                    greeting={dataToRender.chatbot?.greeting || '¡Hola! ¿En qué puedo ayudarte?'}
                />
            )}
        </div>
    );
}
