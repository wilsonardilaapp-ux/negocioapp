
'use client';

import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase';
import Analytics from '@/components/Analytics';
import { FaviconOverrideProvider } from '@/context/FaviconOverrideContext';
import FaviconInjector from '@/components/layout/FaviconInjector';
import CookieConsentBanner from '@/components/layout/CookieConsentBanner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <FaviconOverrideProvider>
        <Analytics />
        <FaviconInjector sourceType="platform" />
        <CookieConsentBanner />
        {children}
        <Toaster />
      </FaviconOverrideProvider>
    </FirebaseClientProvider>
  );
}
