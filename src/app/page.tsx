
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";
import type { LandingPageData } from "@/models/landing-page";
import LandingPageContent from "@/components/landing-page/landing-page-content";
import { ChatbotWidget } from "@/components/chatbot/chatbot-widget";
import type { Module } from "@/models/module";
import { v4 as uuidv4 } from 'uuid';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

// Default data to be used as a fallback in development if Firestore is offline
const initialLandingData: LandingPageData = {
  hero: {
    title: 'Innovación que impulsa tu negocio al futuro',
    subtitle: 'Transformamos tecnología en crecimiento real',
    additionalContent: '',
    imageUrl: 'https://picsum.photos/seed/vintagecar/1200/800', 
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    buttonColor: '#4CAF50',
    ctaButtonText: 'Contáctanos',
    ctaButtonUrl: '#contact'
  },
  navigation: { enabled: true, logoUrl: '', businessName: 'Mi Negocio', logoAlt: 'Logo', logoWidth: 120, logoAlignment: 'left', links: [], backgroundColor: '#FFFFFF', textColor: '#000000', hoverColor: '#4CAF50', fontSize: 16, spacing: 4, useShadow: true },
  sections: [], 
  testimonials: [], 
  seo: { title: 'Mi Negocio', description: '', keywords: [] }, 
  form: { fields: [], destinationEmail: '' }, 
  header: { 
    banner: { mediaUrl: null, mediaType: null }, 
    businessInfo: { name: '', address: '', phone: '', email: '' }, 
    socialLinks: { tiktok: '', instagram: '', facebook: '', whatsapp: '', twitter: '' }, 
    carouselItems: [
        { id: uuidv4(), mediaUrl: null, mediaType: null, slogan: '' },
        { id: uuidv4(), mediaUrl: null, mediaType: null, slogan: '' },
        { id: uuidv4(), mediaUrl: null, mediaType: null, slogan: '' },
    ]
  },
  footer: { enabled: true, contactInfo: { address: '', phone: '', email: '', hours: '' }, quickLinks: [], legalLinks: { privacyPolicyUrl: '', termsAndConditionsUrl: '', cookiesPolicyUrl: '', legalNoticeUrl: '' }, socialLinks: { facebookUrl: '', instagramUrl: '', tiktokUrl: '', youtubeUrl: '', linkedinUrl: '', showIcons: true }, logo: { url: null, slogan: '' }, certifications: [], copyright: { companyName: '', additionalText: '' }, cta: { text: '', url: '', enabled: false }, visuals: { backgroundImageUrl: null, opacity: 80, backgroundColor: '#FFFFFF', textColor: '#000000', darkMode: false, showBackToTop: true }, adminExtras: { systemVersion: '1.0.0', supportLink: '', documentationLink: '' } },
};

async function getLandingPageData(): Promise<{ 
    landingData: LandingPageData | null,
    businessId: string | null,
    chatbot: {
        enabled: boolean;
        businessName: string;
        avatarUrl: string;
        greeting: string;
    } | null
}> {
    try {
        const landingSnap = await getDoc(doc(db, "landing_configs", "main"));
        const landingData = landingSnap.exists() ? (landingSnap.data() as LandingPageData) : null;
        
        const configSnap = await getDoc(doc(db, "globalConfig", "system"));
        const mainBusinessId = configSnap.exists() ? configSnap.data().mainBusinessId : null;

        const chatbotModuleSnap = await getDoc(doc(db, 'modules', 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas'));
        const isChatbotEnabled = chatbotModuleSnap.exists() ? chatbotModuleSnap.data().status === 'active' : false;
        
        const chatbotData = (isChatbotEnabled && landingData) ? {
            enabled: true,
            businessName: landingData.header?.businessInfo?.name || 'Asistente',
            avatarUrl: landingData.chatbot?.avatarUrl || '',
            greeting: landingData.chatbot?.greeting || '¡Hola! ¿En qué puedo ayudarte?',
        } : null;

        return { 
            landingData, 
            businessId: mainBusinessId,
            chatbot: chatbotData
        };
    } catch (error) {
        console.error("Error fetching landing page data:", error);
        return { landingData: null, businessId: null, chatbot: null };
    }
}


export default async function RootPage() {
    const { landingData, businessId, chatbot } = await getLandingPageData();

    if (!landingData) {
        console.warn("ADVERTENCIA: No se pudieron cargar los datos de la landing page desde Firestore. Se utilizarán datos de fallback para desarrollo.");
        return (
            <div className="w-full bg-background">
                <LandingPageContent data={initialLandingData} />
                {/* The chatbot will not be displayed in fallback mode as it requires a specific businessId */}
            </div>
        );
    }

    return (
        <div className="w-full bg-background">
            <LandingPageContent data={landingData} />
            
            {chatbot && businessId && (
                 <ChatbotWidget 
                    enabled={chatbot.enabled}
                    businessId={businessId}
                    businessName={chatbot.businessName}
                    avatarUrl={chatbot.avatarUrl}
                    greeting={chatbot.greeting}
                />
            )}
        </div>
    );
}
