'use client';

import { useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { GlobalConfig } from '@/models/global-config';

/**
 * Inyecta dinámicamente el favicon y el título en el head del documento.
 * Utiliza una estrategia de actualización (update-or-append) para evitar errores 
 * de reconciliación en React (removeChild on null).
 */
export default function FaviconInjector({ 
  faviconUrl: propFaviconUrl, 
  title: propTitle,
  sourceType = 'manual'
}: { 
  faviconUrl?: string | null;
  title?: string | null;
  sourceType?: 'platform' | 'manual';
}) {
  const firestore = useFirestore();

  // Si es tipo plataforma, cargamos los datos globales desde Firestore
  const configRef = useMemoFirebase(() => 
    sourceType === 'platform' ? doc(firestore, 'globalConfig', 'system') : null, 
    [firestore, sourceType]
  );
  
  const { data: config } = useDoc<GlobalConfig>(configRef);

  // Determinar valores finales: Si es plataforma, usa los datos de Firestore; si es manual, usa las props.
  const finalFaviconUrl = sourceType === 'platform' ? config?.faviconUrl : propFaviconUrl;
  const finalTitle = sourceType === 'platform' ? (config?.name || 'Markix Platform') : propTitle;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Actualizar el título de la pestaña de forma segura
    if (finalTitle && document.title !== finalTitle) {
      document.title = finalTitle;
    }

    // 2. Actualizar el Favicon
    if (!finalFaviconUrl) return;

    const updateFavicon = (url: string) => {
      // Intentar encontrar el link existente de favicon (rel icon o shortcut icon)
      let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      
      if (link) {
        // Si existe, solo actualizamos el href
        link.href = url;
      } else {
        // Si no existe, crear uno nuevo y añadirlo al head
        link = document.createElement('link');
        link.rel = 'icon';
        link.href = url;
        document.getElementsByTagName('head')[0].appendChild(link);
      }

      // Repetir para apple-touch-icon (Branding en iOS)
      let appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
      if (appleLink) {
        appleLink.href = url;
      } else {
        appleLink = document.createElement('link');
        appleLink.rel = 'apple-touch-icon';
        appleLink.href = url;
        document.getElementsByTagName('head')[0].appendChild(appleLink);
      }
    };

    updateFavicon(finalFaviconUrl);
    
  }, [finalFaviconUrl, finalTitle]);

  return null;
}
