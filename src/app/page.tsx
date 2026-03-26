'use client';

import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { LandingPageData } from '@/models/landing-page';
import LandingPageContent from '@/components/landing-page/landing-page-content';
import { ChatbotWidget } from '@/components/chatbot/chatbot-widget';
import { Loader2, Frown } from 'lucide-react';
import type { Module } from '@/models/module';
import { useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Datos de respaldo para usar en caso de error de conexión
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
    const { data: globalConfig, isLoading: isGlobalConfigLoading } = useDoc<{ mainBusinessId?: string }>(globalConfigRef);
    const { data: chatbotModule, isLoading: isModuleLoading } = useDoc<Module>(chatbotModuleRef);

    const isLoading = isLandingLoading || isGlobalConfigLoading || isModuleLoading;
    
    useEffect(() => {
        if (error) {
            console.warn("ADVERTENCIA: No se pudo cargar la configuración de la landing page desde Firestore. Se usarán datos de respaldo. Error:", error.message);
        }
    }, [error]);

    const businessId = globalConfig?.mainBusinessId;
    const isChatbotEnabled = chatbotModule?.status === 'active';
    
    const finalData = useMemo(() => {
      // Si hay un error, usa los datos de respaldo. Si no, usa los datos de Firestore.
      const sourceData = error ? initialLandingData : landingData;
      
      if (!sourceData) return null;
      
      const cleanImageUrl =
        sourceData.hero?.imageUrl &&
        typeof sourceData.hero.imageUrl === 'string' &&
        sourceData.hero.imageUrl.trim().length > 0 &&
        sourceData.hero.imageUrl.startsWith('http')
          ? sourceData.hero.imageUrl
          : null;

      return {
        ...sourceData,
        hero: {
          ...sourceData.hero,
          imageUrl: cleanImageUrl,
        },
      };
    }, [landingData, error]);

    if (isLoading && !error) { // No muestres el loader si ya hay un error, para mostrar el fallback inmediatamente.
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!finalData) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center px-4">
                <Frown className="h-16 w-16 text-muted-foreground mb-4" />
                <h1 className="text-2xl font-bold">Página de Inicio no Configurada</h1>
                <p className="text-muted-foreground mt-2 max-w-md">
                    El administrador aún no ha guardado la configuración para la página de inicio desde el panel de control.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full bg-background">
            <LandingPageContent data={finalData} businessId={businessId} />
            
            {isChatbotEnabled && businessId && (
                 <ChatbotWidget 
                    enabled={isChatbotEnabled}
                    businessId={businessId}
                    businessName={finalData.header?.businessInfo?.name || 'Asistente'}
                    avatarUrl={finalData.chatbot?.avatarUrl || ''}
                    greeting={finalData.chatbot?.greeting || '¡Hola! ¿En qué puedo ayudarte?'}
                />
            )}
        </div>
    );
}
