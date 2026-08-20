'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { recordBookingVisit } from '@/actions/public-tracking';

/**
 * @fileOverview Componente invisible que captura parámetros UTM/Source y registra la visita.
 */
export function BookingTracker({ businessId }: { businessId: string }) {
  const searchParams = useSearchParams();
  const trackedRef = useRef(false);

  useEffect(() => {
    // Prevenir doble conteo por re-renders de React Strict Mode
    if (trackedRef.current) return;
    
    const source = searchParams.get('src');
    const serviceId = searchParams.get('service');

    if (businessId && source) {
      trackedRef.current = true;
      // Disparar acción de servidor en segundo plano
      recordBookingVisit(businessId, source, serviceId || undefined).catch(() => {});
    }
  }, [businessId, searchParams]);

  return null;
}
