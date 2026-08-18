'use client';

import React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ReservasTabs } from '@/components/reservas/ReservasTabs';
import { QrStudioCard } from '@/components/reservas/QrStudioCard';
import { ShareLinksList } from '@/components/reservas/ShareLinksList';
import { Share2, Loader2 } from 'lucide-react';
import type { BookingService } from '@/models/booking';

/**
 * @fileOverview Página administrativa del Centro de Difusión de Reservas.
 */

export default function ReservasCompartirPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  // Obtener servicios activos para generar enlaces directos
  const servicesQuery = useMemoFirebase(() => {
    if (!user?.uid || !firestore) return null;
    return query(
      collection(firestore, `businesses/${user.uid}/bookingServices`),
      where('isActive', '==', true)
    );
  }, [user?.uid, firestore]);

  const { data: services, isLoading } = useCollection<BookingService>(servicesQuery);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="space-y-1">
        <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
          <Share2 className="h-8 w-8 text-primary" />
          Centro de Difusión
        </h1>
        <p className="text-muted-foreground">Herramientas para promocionar tu agenda y recibir citas desde cualquier canal.</p>
      </header>

      <ReservasTabs />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground animate-pulse">Preparando herramientas de marketing...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-1">
                <QrStudioCard businessId={user?.uid!} />
            </div>
            <div className="lg:col-span-2">
                <ShareLinksList 
                    businessId={user?.uid!} 
                    services={services || []} 
                />
            </div>
        </div>
      )}
    </div>
  );
}
