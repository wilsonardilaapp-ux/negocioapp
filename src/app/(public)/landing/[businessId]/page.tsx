'use client';

import React, { useMemo } from 'react';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { useDocOnce } from '@/firebase/hooks/use-doc-once';
import { doc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Loader2, Frown, Settings } from 'lucide-react';
import type { LandingPageData } from '@/models/landing-page';
import LandingPageContent from '@/components/landing-page/landing-page-content';
import { ChatbotWidget } from '@/components/chatbot/chatbot-widget';
import type { Module } from '@/models/module';

export const dynamic = 'force-dynamic';

export default function BusinessLandingPage() {
    const firestore = useFirestore();
    const params = useParams();
    const businessId = params.businessId as string;

    const landingPageDocRef = useMemoFirebase(() => {
        if (!firestore || !businessId) return null;
        return doc(firestore, 'businesses', businessId, 'landingPages', 'main');
    }, [firestore, businessId]);

    const chatbotModuleRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'modules', 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas');
    }, [firestore]);

    const { data: landingData, isLoading: isLandingLoading, error } = useDocOnce<LandingPageData>(landingPageDocRef);
    const { data: chatbotModule, isLoading: isModuleLoading } = useDocOnce<Module>(chatbotModuleRef);

    const isLoading = isLandingLoading || isModuleLoading;

    const finalData = useMemo(() => {
      if (!landingData) return null;
      const cleanImageUrl =
        landingData.hero?.imageUrl &&
        typeof landingData.hero.imageUrl === 'string' &&
        landingData.hero.imageUrl.trim().length > 0 &&
        landingData.hero.imageUrl.startsWith('http')
          ? landingData.hero.imageUrl
          : null;

      return {
        ...landingData,
        hero: {
          ...landingData.hero,
          imageUrl: cleanImageUrl,
        },
      };
    }, [landingData]);
    
    const isChatbotEnabled = chatbotModule?.status === 'active';


    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center px-4">
                <Frown className="h-16 w-16 text-destructive mb-4" />
                <h1 className="text-2xl font-bold text-destructive">Error al Cargar la Página</h1>
                <p className="text-muted-foreground mt-2 max-w-md">
                   No se pudo cargar la página. Verifica que el enlace sea correcto y que las reglas de seguridad de Firestore permitan el acceso público a 'businesses/{'{businessId}'}/landingPages/main'.
                </p>
                <pre className="mt-4 p-4 bg-muted rounded-md text-left text-xs overflow-auto">{error.message}</pre>
            </div>
        );
    }
    
    if (!finalData) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center px-4">
                <Frown className="h-16 w-16 text-muted-foreground mb-4" />
                <h1 className="text-2xl font-bold">Página no Encontrada</h1>
                <p className="text-muted-foreground mt-2 max-w-md">
                    La configuración de la landing page para este negocio no existe. El administrador debe crearla desde el panel de control.
                </p>
            </div>
        );
    }

    return (
        <div>
            <LandingPageContent data={finalData} businessId={businessId} />
            <ChatbotWidget 
                enabled={isChatbotEnabled}
                businessId={businessId}
                businessName={finalData.header.businessInfo.name || 'Asistente'}
                avatarUrl={finalData.chatbot?.avatarUrl || ''}
                greeting={finalData.chatbot?.greeting || '¡Hola! ¿En qué puedo ayudarte?'}
            />
        </div>
    );
}
