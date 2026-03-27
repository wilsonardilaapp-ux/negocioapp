'use client';

import { useMemo, useState, useEffect } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2, Frown } from 'lucide-react';
import type { LandingPageData } from '@/models/landing-page';
import LandingPageContent from '@/components/landing-page/landing-page-content';
import { ChatbotWidget } from '@/components/chatbot/chatbot-widget';
import type { Module } from '@/models/module';

// Datos de respaldo SÓLO si el documento no existe en la base de datos.
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
        [firestore]
    );

    const { data: landingData, isLoading: isLandingLoading, error: landingError } = useDoc<LandingPageData>(landingConfigRef);
    const { data: globalConfig, isLoading: isGlobalConfigLoading } = useDoc<any>(globalConfigRef);
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
    
    // Si hay un error de conexión, useDoc lo maneja y devuelve los datos de la caché si existen.
    // Mostramos error solo si la carga termina, no hay datos Y hay un error.
    if (landingError && !landingData) {
       return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center px-4">
                <Frown className="h-16 w-16 text-destructive mb-4" />
                <h1 className="text-2xl font-bold text-destructive">Error de Conexión</h1>
                <p className="text-muted-foreground mt-2 max-w-md">
                   No se pudo cargar la configuración de la página. Es posible que estés sin conexión.
                </p>
                <pre className="mt-4 p-4 bg-muted rounded-md text-left text-xs overflow-auto">{landingError.message}</pre>
            </div>
        );
    }

    const dataToRender = landingData ?? fallbackData;

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
