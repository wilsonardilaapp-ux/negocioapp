'use server';

import React from 'react';
import { getAdminFirestore } from '@/firebase/server-init';
import { unstable_noStore as noStore } from 'next/cache';

import LandingPageContent from '@/components/landing-page/landing-page-content';
import { ChatbotWidget } from '@/components/chatbot/chatbot-widget';
import { Frown, Settings } from 'lucide-react';
import type { LandingPageData } from '@/models/landing-page';
import type { Module } from '@/models/module';
import type { Business } from '@/models/business';

async function getBusinessPageData(slug: string) {
    noStore();
    const db = await getAdminFirestore();

    // 1. Resolve slug to businessId
    const shareConfigQuery = db.collectionGroup('shareConfig').where('slug', '==', slug).limit(1);
    const querySnapshot = await shareConfigQuery.get();
    const customSlugDoc = querySnapshot.docs.find(doc => doc.data().useCustomSlug === true);
    
    // If a custom slug is found and it's active, use its businessId. Otherwise, treat the slug as the businessId.
    const businessId = customSlugDoc ? (customSlugDoc.ref.parent.parent?.id ?? slug) : slug;
    
    if (!businessId) {
        return { business: null, landingData: null, chatbotModule: null, resolvedBusinessId: null };
    }

    // 2. Fetch all data in parallel using the resolved businessId
    const businessDocRef = db.collection('businesses').doc(businessId);
    const landingPageDocRef = db.collection('businesses').doc(businessId).collection('landingPages').doc('main');
    const chatbotModuleRef = db.collection('modules').doc('chatbot-integrado-con-whatsapp-para-soporte-y-ventas');

    const [businessSnap, landingPageSnap, chatbotModuleSnap] = await Promise.all([
        businessDocRef.get(),
        landingPageDocRef.get(),
        chatbotModuleRef.get()
    ]);

    return {
        business: businessSnap.exists ? (businessSnap.data() as Business) : null,
        landingData: landingPageSnap.exists ? (landingPageSnap.data() as LandingPageData) : null,
        chatbotModule: chatbotModuleSnap.exists ? (chatbotModuleSnap.data() as Module) : null,
        resolvedBusinessId: businessId,
    };
}


export default async function BusinessLandingPage({ params }: { params: { businessId: string } }) {
    // The param is the slug, which might be a custom slug or the businessId itself
    const { businessId: slug } = params;

    if (!slug) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-4 text-center">
               <h2 className="text-2xl font-bold text-gray-800">ID de Negocio o alias no proporcionado.</h2>
            </div>
        );
    }
    
    try {
        const { business, landingData, chatbotModule, resolvedBusinessId } = await getBusinessPageData(slug);

        if (!business) {
            return (
               <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-4 text-center">
                   <div className="bg-white p-10 rounded-3xl shadow-sm max-w-md border border-gray-100">
                       <Frown className="text-gray-300 w-16 h-16 mx-auto mb-4" />
                       <h2 className="text-2xl font-bold text-gray-800">Negocio no Encontrado</h2>
                       <p className="text-gray-500 leading-relaxed">
                          El enlace que has seguido parece ser incorrecto o el negocio ya no existe.
                       </p>
                   </div>
               </div>
           );
        }

        if (!landingData) {
            return (
                <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-4 text-center">
                    <div className="bg-white p-10 rounded-3xl shadow-sm max-w-md border border-gray-100">
                        <Frown className="text-gray-300 w-16 h-16 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800">Página no Publicada</h2>
                        <p className="text-gray-500 leading-relaxed">
                            Este negocio aún no ha configurado o publicado su página de bienvenida.
                        </p>
                    </div>
                </div>
            );
        }
        
        const isChatbotEnabled = chatbotModule?.status === 'active';

        return (
            <div>
                <LandingPageContent data={landingData} businessId={resolvedBusinessId ?? undefined} />
                <ChatbotWidget 
                    enabled={isChatbotEnabled}
                    businessId={resolvedBusinessId!}
                    businessName={landingData.header?.businessInfo?.name || 'Asistente'}
                    avatarUrl={landingData.chatbot?.avatarUrl || ''}
                    greeting={landingData.chatbot?.greeting || '¡Hola! ¿En qué puedo ayudarte?'}
                />
            </div>
        );

    } catch (error: any) {
         return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-4 text-center">
               <div className="bg-white p-10 rounded-3xl shadow-sm max-w-md border border-gray-100">
                   <Settings className="text-red-400 w-16 h-16 mx-auto mb-4" />
                   <h2 className="text-2xl font-bold text-red-800">Error del Servidor</h2>
                   <p className="text-gray-500 leading-relaxed">
                      Ocurrió un error al cargar la página. Por favor, revisa la configuración del servidor.
                   </p>
                   <pre className="mt-4 p-2 bg-red-50 text-red-600 text-xs text-left rounded-md overflow-auto max-w-full">{error.message}</pre>
               </div>
           </div>
       );
    }
}
