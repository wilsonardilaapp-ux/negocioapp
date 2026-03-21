
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, limit, getDocs, query } from 'firebase/firestore';
import { Loader2, Frown, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LandingPageData } from '@/models/landing-page';
import LandingPageContent from '@/components/landing-page/landing-page-content';
import type { GlobalConfig } from '@/models/global-config';
import type { Business } from '@/models/business';
import { ChatbotWidget } from '@/components/chatbot/chatbot-widget';
import type { Module } from '@/models/module';


export default function RootPage() {
    const firestore = useFirestore();

    const configDocRef = useMemoFirebase(() => {
        if (!firestore) return null; // Wait for firestore to be initialized
        return doc(firestore, 'globalConfig', 'system');
    }, [firestore]);
    const { data: config, isLoading: isConfigLoading } = useDoc<GlobalConfig>(configDocRef);
    
    const mainBusinessId = config?.mainBusinessId;

    const landingPageDocRef = useMemoFirebase(() => {
        if (!firestore || !mainBusinessId) return null;
        return doc(firestore, 'businesses', mainBusinessId, 'landingPages', 'main');
    }, [firestore, mainBusinessId]);
    
    const chatbotModuleRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'modules', 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas');
    }, [firestore]);

    const { data: landingData, isLoading: isLandingLoading, error } = useDoc<LandingPageData>(landingPageDocRef);
    const { data: chatbotModule, isLoading: isModuleLoading } = useDoc<Module>(chatbotModuleRef);

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
    
    const isLoading = isConfigLoading || (mainBusinessId && isLandingLoading) || isModuleLoading;

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!mainBusinessId) {
         return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center px-4">
                <Settings className="h-16 w-16 text-muted-foreground mb-4" />
                <h1 className="text-2xl font-bold">Configuración Inicial Requerida</h1>
                <p className="text-muted-foreground mt-2 max-w-md">
                   No se ha encontrado un negocio principal configurado. Por favor, regístrate para configurar la página.
                </p>
                 <Button asChild className="mt-4">
                    <a href="/register">Crear Cuenta</a>
                </Button>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center px-4">
                <Frown className="h-16 w-16 text-destructive mb-4" />
                <h1 className="text-2xl font-bold text-destructive">Error al Cargar la Página</h1>
                <p className="text-muted-foreground mt-2 max-w-md">
                   No se pudo cargar la página. Verifica que las reglas de seguridad de Firestore permitan el acceso público a 'businesses/{'{businessId}'}/landingPages/main'.
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
    
    const isChatbotEnabled = chatbotModule?.status === 'active';

    return (
        <div>
            <LandingPageContent data={finalData} businessId={mainBusinessId} />
            <ChatbotWidget 
                enabled={isChatbotEnabled}
                businessId={mainBusinessId}
                businessName={finalData.header.businessInfo.name || 'Asistente'}
                avatarUrl={finalData.chatbot?.avatarUrl || ''}
                greeting={finalData.chatbot?.greeting || '¡Hola! ¿En qué puedo ayudarte?'}
            />
        </div>
    );
}
