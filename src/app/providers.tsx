'use client';

import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase';
import Analytics from '@/components/Analytics';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <Analytics />
      {children}
      <Toaster />
    </FirebaseClientProvider>
  );
}
