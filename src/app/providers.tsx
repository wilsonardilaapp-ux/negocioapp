'use client';

import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase';
import Analytics from '@/components/Analytics';
import { FaviconOverrideProvider } from '@/context/FaviconOverrideContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <FaviconOverrideProvider>
        <Analytics />
        {children}
        <Toaster />
      </FaviconOverrideProvider>
    </FirebaseClientProvider>
  );
}
