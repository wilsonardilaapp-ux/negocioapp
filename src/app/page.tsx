
'use client';

import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { LandingPageData } from '@/models/landing-page';
import LandingPageContent from '@/components/landing-page/landing-page-content';
import { ChatbotWidget } from '@/components/chatbot/chatbot-widget';
import { Loader2 } from 'lucide-react';
import type { Module } from '@/models/module';
import { useMemo } from 'react';
import type { GlobalConfig } from '@/models/global-config';
import { v4 as uuidv4 } from 'uuid';

// Fallback data that matches the editor's initial state.
const fallbackData: LandingPageData = {
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

export default function RootPage() {
    const firestore = useFirestore();

    const landingConfigRef = useMemoFirebase(() =>
        firestore ? doc(firestore, 'landing_configs', 'main') : null,
        [firestore]
    );

    const globalConfigRef = useMemoFirebase(() =>
        firestore ? doc(firestore, 'globalConfig', 'system') : null,
        [firestore]
    );
    
    const chatbotModuleRef = useMemoFirebase(() => 
        firestore ? doc(firestore, 'modules', 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas') : null, 
    [firestore]);

    const { data: landingData, isLoading: isLandingLoading, error } = useDoc<LandingPageData>(landingConfigRef);
    const { data: globalConfig, isLoading: isGlobalConfigLoading } = useDoc<GlobalConfig>(globalConfigRef);
    const { data: chatbotModule, isLoading: isModuleLoading } = useDoc<Module>(chatbotModuleRef);

    const isLoading = isLandingLoading || isGlobalConfigLoading || isModuleLoading;
    const businessId = globalConfig?.mainBusinessId;
    const isChatbotEnabled = chatbotModule?.status === 'active';

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    // If there's a Firestore error (like offline) or no data, use the fallback. Otherwise, use the live data.
    const dataToRender = landingData ?? fallbackData;
    
    if (error) {
        console.warn("ADVERTENCIA: No se pudo cargar la configuración de la landing page. Usando datos de respaldo. Error:", error.message);
    }

    return (
        <div className="w-full bg-background">
            <LandingPageContent data={dataToRender} businessId={businessId} />
            
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
