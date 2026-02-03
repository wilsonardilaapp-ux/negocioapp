'use client';

import { useMemo } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2, Frown, Settings } from 'lucide-react';
import type { LandingPageData } from '@/models/landing-page';
import type { GlobalConfig } from '@/models/global-config';
import { PublicContactForm } from '@/components/landing-page/public-contact-form';

export default function ContactPage() {
    const firestore = useFirestore();

    const configDocRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'globalConfig', 'system');
    }, [firestore]);
    
    const { data: config, isLoading: isConfigLoading } = useDoc<GlobalConfig>(configDocRef);
    
    const mainBusinessId = config?.mainBusinessId;

    const landingPageDocRef = useMemoFirebase(() => {
        if (!firestore || !mainBusinessId) return null;
        return doc(firestore, 'businesses', mainBusinessId, 'landingPages', 'main');
    }, [firestore, mainBusinessId]);

    const { data: landingData, isLoading: isLandingLoading, error } = useDoc<LandingPageData>(landingPageDocRef);

    const isLoading = isConfigLoading || isLandingLoading;
    
    const formConfig = landingData?.form;

    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !formConfig || !mainBusinessId || !formConfig.fields || formConfig.fields.length === 0) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center text-center px-4">
                <Frown className="h-16 w-16 text-destructive mb-4" />
                <h1 className="text-2xl font-bold text-destructive">Error al Cargar el Formulario</h1>
                <p className="text-muted-foreground mt-2 max-w-md">
                   No se pudo encontrar la configuración del formulario o no tiene campos definidos.
                   Asegúrate de que exista en el panel de control de la landing page.
                </p>
                {error && <pre className="mt-4 p-4 bg-muted rounded-md text-left text-xs overflow-auto max-w-full">{error.message}</pre>}
            </div>
        );
    }

    return (
        <PublicContactForm formConfig={formConfig} businessId={mainBusinessId} />
    );
}
