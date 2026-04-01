'use server';

import React from 'react';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { unstable_noStore as noStore } from 'next/cache';

import LandingPageContent from '@/components/landing-page/landing-page-content';
import { ChatbotWidget } from '@/components/chatbot/chatbot-widget';
import { Loader2, Frown } from 'lucide-react';
import type { LandingPageData } from '@/models/landing-page';
import type { Module } from '@/models/module';
import type { Business } from '@/models/business';

// Función segura para inicializar el cliente de Firebase en el servidor
const getClientDb = () => {
    if (!firebaseConfig.projectId) {
        throw new Error("El projectId de Firebase no está configurado.");
    }
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    return getFirestore(app);
};

// Función de obtención de datos del servidor
async function getBusinessPageData(businessId: string) {
    noStore(); // Previene el caché de datos
    const db = getClientDb();

    // Referencias a los documentos
    const businessDocRef = doc(db, 'businesses', businessId);
    const landingPageDocRef = doc(db, 'businesses', businessId, 'landingPages', 'main');
    const chatbotModuleRef = doc(db, 'modules', 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas');
    
    // Obtener todos los datos en paralelo
    const [businessSnap, landingPageSnap, chatbotModuleSnap] = await Promise.all([
        getDoc(businessDocRef),
        getDoc(landingPageDocRef),
        getDoc(chatbotModuleRef)
    ]);

    return {
        business: businessSnap.exists() ? (businessSnap.data() as Business) : null,
        landingData: landingPageSnap.exists() ? (landingPageSnap.data() as LandingPageData) : null,
        chatbotModule: chatbotModuleSnap.exists() ? (chatbotModuleSnap.data() as Module) : null,
    };
}


export default async function BusinessLandingPage({ params }: { params: { businessId: string } }) {
    const { businessId } = params;

    if (!businessId) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-4 text-center">
               <h2 className="text-2xl font-bold text-gray-800">ID de Negocio no proporcionado.</h2>
            </div>
        );
    }
    
    try {
        const { business, landingData, chatbotModule } = await getBusinessPageData(businessId);

        if (!business) {
            return (
               <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-4 text-center">
                   <div className="bg-white p-10 rounded-3xl shadow-sm max-w-md border border-gray-100">
                       <div className="text-gray-300 text-6xl mb-4">☹️</div>
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
                        <div className="text-gray-300 text-6xl mb-4">☹️</div>
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

    } catch (error: any) {
         return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-4 text-center">
               <div className="bg-white p-10 rounded-3xl shadow-sm max-w-md border border-gray-100">
                   <div className="text-red-400 text-6xl mb-4">☹️</div>
                   <h2 className="text-2xl font-bold text-red-800">Error Inesperado</h2>
                   <p className="text-gray-500 leading-relaxed">
                      Ocurrió un error al cargar la página. Por favor, intenta de nuevo más tarde.
                   </p>
                   <pre className="mt-4 p-2 bg-red-50 text-red-600 text-xs text-left rounded-md overflow-auto">{error.message}</pre>
               </div>
           </div>
       );
    }
}
