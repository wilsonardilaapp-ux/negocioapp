'use client';

import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import Script from 'next/script';
import type { Module } from '@/models/module';
import type { Business } from '@/models/business';
import { usePathname } from 'next/navigation';

const GTAG_URL = "https://www.googletagmanager.com/gtag/js?id=";

export default function Analytics() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser(); // Get user and loading state
    const pathname = usePathname();

    // The root cause of the "Target ID already exists" error on public pages
    // is this component trying to fetch user-specific data (triggering useUser)
    // on pages where it's not needed, causing listener conflicts in React's Strict Mode.
    // By checking the path, we prevent any user-related hooks from running on public pages.
    const isDashboardOrAdminPage = pathname.startsWith('/dashboard') || pathname.startsWith('/superadmin');

    if (!isDashboardOrAdminPage) {
        return null;
    }

    // 1. Check if the 'google-analytics' module is active
    const gaModuleQuery = useMemoFirebase(() => {
        // Only query if user is logged in and not loading
        if (!firestore || isUserLoading || !user) return null;
        return doc(firestore, 'modules', 'google-analytics');
    }, [firestore, user, isUserLoading]);
    const { data: gaModule, isLoading: isModuleLoading } = useDoc<Module>(gaModuleQuery);

    // 2. Get the specific business's (client's) GA ID
    const businessDocRef = useMemoFirebase(() => {
        if (!firestore || isUserLoading || !user) return null;
        return doc(firestore, 'businesses', user.uid);
    }, [firestore, user, isUserLoading]);
    const { data: business, isLoading: isBusinessLoading } = useDoc<Business>(businessDocRef);

    // Wait for auth and data to load, or if no user is present
    if (isUserLoading || isModuleLoading || isBusinessLoading || !user) {
        return null;
    }
    
    const gaIsActive = gaModule?.status === 'active';
    const gaId = business?.googleAnalyticsId;

    // Do not inject script if the module is inactive or the client hasn't set their ID
    if (!gaIsActive || !gaId) {
        return null;
    }

    return (
        <>
            <Script
                strategy="afterInteractive"
                src={`${GTAG_URL}${gaId}`}
            />
            <Script
                id="gtag-init"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                    __html: `
                        window.dataLayer = window.dataLayer || [];
                        function gtag(){dataLayer.push(arguments);}
                        gtag('js', new Date());
                        gtag('config', '${gaId}', {
                            page_path: window.location.pathname,
                        });
                    `,
                }}
            />
        </>
    );
}
