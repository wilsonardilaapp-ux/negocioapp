'use client';

import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import Script from 'next/script';
import type { Module } from '@/models/module';
import type { Business } from '@/models/business';

const GTAG_URL = "https://www.googletagmanager.com/gtag/js?id=";

export default function AnalyticsContent() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();

    const gaModuleQuery = useMemoFirebase(() => {
        if (!firestore || isUserLoading || !user) return null;
        return doc(firestore, 'modules', 'google-analytics');
    }, [firestore, user, isUserLoading]);

    const businessDocRef = useMemoFirebase(() => {
        if (!firestore || isUserLoading || !user) return null;
        return doc(firestore, 'businesses', user.uid);
    }, [firestore, user, isUserLoading]);

    const { data: gaModule, isLoading: isModuleLoading } = useDoc<Module>(gaModuleQuery);
    const { data: business, isLoading: isBusinessLoading } = useDoc<Business>(businessDocRef);

    if (isUserLoading || isModuleLoading || isBusinessLoading || !user) return null;

    const gaIsActive = gaModule?.status === 'active';
    const gaId = business?.googleAnalyticsId;

    if (!gaIsActive || !gaId) return null;

    return (
        <>
            <Script strategy="afterInteractive" src={`${GTAG_URL}${gaId}`} />
            <Script
                id="gtag-init"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', '${gaId}', { page_path: window.location.pathname });
                    `,
                }}
            />
        </>
    );
}
