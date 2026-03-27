
'use server';

import LandingPageContent from '@/components/landing-page/landing-page-content';
import { ChatbotWidget } from '@/components/chatbot/chatbot-widget';
import { getLandingConfig } from '@/actions/save-landing-config';
import { getAdminFirestore } from '@/firebase/server-init';
import type { LandingPageData } from '@/models/landing-page';
import { v4 as uuidv4 } from 'uuid';
import { Frown, Loader2 } from 'lucide-react';
import type { Module } from '@/models/module';

// Fallback data, consistent with the editor's initial state.
const fallbackData: LandingPageData = {
  hero: {
    title: 'Bienvenido a Nuestra Plataforma',
    subtitle: 'Esta página está lista para ser configurada desde el panel de Super Admin.',
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

export default async function RootPage() {
    const landingData = await getLandingConfig();
    
    // If fetching fails, use the fallback data. This makes the page resilient.
    const dataToRender = landingData ?? fallbackData;

    let businessId: string | null = null;
    let isChatbotEnabled = false;

    try {
        const firestore = await getAdminFirestore();
        const globalConfigSnap = await firestore.collection('globalConfig').doc('system').get();
        if (globalConfigSnap.exists()) {
            businessId = globalConfigSnap.data()?.mainBusinessId || null;
        }

        // Only check chatbot module if a main business is set.
        if (businessId) {
            const chatbotModuleSnap = await firestore.collection('modules').doc('chatbot-integrado-con-whatsapp-para-soporte-y-ventas').get();
            isChatbotEnabled = chatbotModuleSnap.exists() && chatbotModuleSnap.data()?.status === 'active';
        }
    } catch(e) {
        console.warn("Could not fetch supplemental config for RootPage (e.g., chatbot). This can be normal if offline.", e);
    }

    return (
        <div className="w-full bg-background">
            <LandingPageContent data={dataToRender} businessId={businessId || undefined} />
            
            {isChatbotEnabled && businessId && (
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
