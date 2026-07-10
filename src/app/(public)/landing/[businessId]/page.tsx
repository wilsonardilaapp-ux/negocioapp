'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc, collectionGroup, query, where, getDocs, limit, collection } from 'firebase/firestore';

import LandingPageContent from '@/components/landing-page/landing-page-content';
import { ChatbotWidget } from '@/components/chatbot/chatbot-widget';
import { Frown, Settings, Loader2, PackageSearch } from 'lucide-react';
import type { LandingPageData } from '@/models/landing-page';
import type { Module } from '@/models/module';
import type { Business } from '@/models/business';
import type { SubscriptionPlan } from '@/models/subscription-plan';
import type { HybridPlan } from '@/models/hybrid-plan';

function BusinessLandingContent() {
    const params = useParams();
    // Decodificar el slug para manejar caracteres como tildes o emojis que llegan codificados por la URL
    const slug = decodeURIComponent(params.businessId as string);
    const { firestore, isNetworkEnabled } = useFirebase();

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pageData, setPageData] = useState<{
        business: Business | null;
        landingData: LandingPageData | null;
        chatbotModule: Module | null;
        plans: SubscriptionPlan[];
        hybridPlans: HybridPlan[];
        resolvedBusinessId: string | null;
    }>({
        business: null,
        landingData: null,
        chatbotModule: null,
        plans: [],
        hybridPlans: [],
        resolvedBusinessId: null,
    });

    useEffect(() => {
        if (!firestore || !slug || !isNetworkEnabled) {
            if (!isNetworkEnabled && slug) return; // Esperar a la red
            setIsLoading(false);
            return;
        }

        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // 1. Resolver slug a businessId usando el campo slugLanding
                const shareConfigQuery = query(collectionGroup(firestore, 'shareConfig'), where('slugLanding', '==', slug), limit(1));
                const querySnapshot = await getDocs(shareConfigQuery);
                
                const customSlugDoc = querySnapshot.docs.find(doc => doc.data().useCustomSlugLanding === true);
                
                const businessId = customSlugDoc ? (customSlugDoc.ref.parent.parent?.id ?? slug) : slug;
                
                if (!businessId) {
                    throw new Error("El alias del negocio no es válido o no se encontró.");
                }

                // 2. Obtener todos los datos en paralelo incluyendo los planes para sincronizar con el editor
                const businessDocRef = doc(firestore, 'businesses', businessId);
                const landingPageDocRef = doc(firestore, 'businesses', businessId, 'landingPages', 'main');
                const chatbotModuleRef = doc(firestore, 'modules', 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas');
                const plansRef = collection(firestore, 'plans');
                const hybridPlansRef = collection(firestore, 'hybrid_plans');

                const [businessSnap, landingPageSnap, chatbotModuleSnap, plansSnap, hybridPlansSnap] = await Promise.all([
                    getDoc(businessDocRef),
                    getDoc(landingPageDocRef),
                    getDoc(chatbotModuleRef),
                    getDocs(plansRef),
                    getDocs(hybridPlansRef)
                ]);

                if (!businessSnap.exists()) {
                    throw new Error("El negocio asociado a esta URL no existe.");
                }

                setPageData({
                    business: businessSnap.data() as Business,
                    landingData: landingPageSnap.exists() ? (landingPageSnap.data() as LandingPageData) : null,
                    chatbotModule: chatbotModuleSnap.exists() ? (chatbotModuleSnap.data() as Module) : null,
                    plans: plansSnap.docs.map(d => ({ ...d.data(), id: d.id } as SubscriptionPlan)),
                    hybridPlans: hybridPlansSnap.docs.map(d => ({ ...d.data(), id: d.id } as HybridPlan)),
                    resolvedBusinessId: businessId,
                });

            } catch (e: any) {
                console.error("Error al cargar la landing:", e.message);
                setError(e.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [slug, firestore, isNetworkEnabled]);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-4 text-center">
                <div className="bg-white p-10 rounded-3xl shadow-sm max-w-md border border-gray-100">
                    <Frown className="text-red-300 w-16 h-16 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-red-800">Negocio no Encontrado</h2>
                    <p className="text-gray-500 leading-relaxed">{error}</p>
                </div>
            </div>
        );
    }
    
    if (!pageData.landingData) {
        return (
             <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-4 text-center">
                <div className="bg-white p-10 rounded-3xl shadow-sm max-w-md border border-gray-100">
                    <PackageSearch className="text-gray-300 w-16 h-16 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800">Página no Publicada</h2>
                    <p className="text-gray-500 leading-relaxed">
                        Este negocio aún no ha configurado o publicado su página de bienvenida.
                    </p>
                </div>
            </div>
        );
    }
    
    const isChatbotEnabled = pageData.chatbotModule?.status === 'active';

    return (
        <div>
            <LandingPageContent 
                data={pageData.landingData} 
                plans={pageData.plans}
                hybridPlans={pageData.hybridPlans}
                businessId={pageData.resolvedBusinessId ?? undefined} 
            />
            <ChatbotWidget 
                enabled={isChatbotEnabled}
                businessId={pageData.resolvedBusinessId!}
                businessName={pageData.landingData.header?.businessInfo?.name || 'Asistente'}
                avatarUrl={pageData.landingData.chatbot?.avatarUrl || ''}
                greeting={pageData.landingData.chatbot?.greeting || '¡Hola! ¿En qué puedo ayudarte?'}
            />
        </div>
    );
}

export default function BusinessLandingPage() {
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <React.Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        }>
            <BusinessLandingContent />
        </React.Suspense>
    );
}