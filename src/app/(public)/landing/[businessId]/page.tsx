'use client';

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { useDocOnce } from '@/firebase/hooks/use-doc-once';
import LandingPageContent from '@/components/landing-page/landing-page-content';
import { ChatbotWidget } from '@/components/chatbot/chatbot-widget';
import { Loader2, Frown } from 'lucide-react';
import type { LandingPageData } from '@/models/landing-page';
import type { Module } from '@/models/module';
import type { Business } from '@/models/business';

export default function BusinessLandingPage() {
    const firestore = useFirestore();
    const params = useParams();
    const businessId = params.businessId as string;

    const businessDocRef = useMemoFirebase(() => {
        if (!firestore || !businessId) return null;
        return doc(firestore, 'businesses', businessId);
    }, [firestore, businessId]);

    const landingPageDocRef = useMemoFirebase(() => {
        if (!firestore || !businessId) return null;
        return doc(firestore, 'businesses', businessId, 'landingPages', 'main');
    }, [firestore, businessId]);

    const chatbotModuleRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'modules', 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas');
    }, [firestore]);

    const { data: business, isLoading: isBusinessLoading, error: businessError } = useDocOnce<Business>(businessDocRef);
    const { data: landingData, isLoading: isLandingLoading, error: landingError } = useDocOnce<LandingPageData>(landingPageDocRef);
    const { data: chatbotModule, isLoading: isModuleLoading } = useDocOnce<Module>(chatbotModuleRef);

    const isLoading = isBusinessLoading || isLandingLoading || isModuleLoading;

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (businessError || !business) {
        return (
           <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-4 text-center">
               <div className="bg-white p-10 rounded-3xl shadow-sm max-w-md border border-gray-100">
                   <div className="text-gray-300 text-6xl mb-4">☹️</div>
                   <h2 className="text-2xl font-bold text-gray-800">Negocio no Encontrado</h2>
                   <p className="text-gray-500 leading-relaxed">
                      El enlace que has seguido parece ser incorrecto o el negocio ya no existe.
                   </p>
                   {businessError && <pre className="mt-4 p-2 bg-red-50 text-red-600 text-xs text-left rounded-md">{businessError.message}</pre>}
               </div>
           </div>
       );
    }

    if (landingError || !landingData) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-4 text-center">
                <div className="bg-white p-10 rounded-3xl shadow-sm max-w-md border border-gray-100">
                    <div className="text-gray-300 text-6xl mb-4">☹️</div>
                    <h2 className="text-2xl font-bold text-gray-800">Página no Publicada</h2>
                    <p className="text-gray-500 leading-relaxed">
                        Este negocio aún no ha configurado o publicado su página de bienvenida.
                    </p>
                    {landingError && <pre className="mt-4 p-2 bg-red-50 text-red-600 text-xs text-left rounded-md">{landingError.message}</pre>}
                </div>
            </div>
        );
    }
    
    const isChatbotEnabled = chatbotModule?.status === 'active';

    return (
        <div>
            <LandingPageContent data={landingData} businessId={businessId} />
            <ChatbotWidget 
                enabled={isChatbotEnabled}
                businessId={businessId}
                businessName={landingData.header?.businessInfo?.name || 'Asistente'}
                avatarUrl={landingData.chatbot?.avatarUrl || ''}
                greeting={landingData.chatbot?.greeting || '¡Hola! ¿En qué puedo ayudarte?'}
            />
        </div>
    );
}