'use client';

import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { LandingPageData } from '@/models/landing-page';
import LandingPageContent from '@/components/landing-page/landing-page-content';
import { ChatbotWidget } from '@/components/chatbot/chatbot-widget';
import { Loader2, Frown } from 'lucide-react';
import type { Module } from '@/models/module';
import { useMemo } from 'react';

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


    const { data: landingData, isLoading: isLandingLoading } = useDoc<LandingPageData>(landingConfigRef);
    const { data: globalConfig, isLoading: isGlobalConfigLoading } = useDoc<{ mainBusinessId?: string }>(globalConfigRef);
    const { data: chatbotModule, isLoading: isModuleLoading } = useDoc<Module>(chatbotModuleRef);

    const isLoading = isLandingLoading || isGlobalConfigLoading || isModuleLoading;
    
    const businessId = globalConfig?.mainBusinessId;
    const isChatbotEnabled = chatbotModule?.status === 'active';
    
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

    if (isLoading) {
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
