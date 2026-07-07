
'use client';

import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase';
import Analytics from '@/components/Analytics';
import { FaviconOverrideProvider } from '@/context/FaviconOverrideContext';
import FaviconInjector from '@/components/layout/FaviconInjector';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <FaviconOverrideProvider>
        <Analytics />
        <FaviconInjector sourceType="platform" />
        {children}
        <Toaster />
      </FaviconOverrideProvider>
    </FirebaseClientProvider>
  );
}
