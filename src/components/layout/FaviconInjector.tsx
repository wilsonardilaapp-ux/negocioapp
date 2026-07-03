'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { GlobalConfig } from '@/models/global-config';

/**
 * Inyecta dinámicamente el favicon y el título en el head del documento.
 * Incluye lógica de limpieza para restaurar el estado anterior al navegar
 * fuera de páginas con branding específico de negocio.
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
  const pathname = usePathname();

  const configRef = useMemoFirebase(() => 
    sourceType === 'platform' ? doc(firestore, 'globalConfig', 'system') : null, 
    [firestore, sourceType]
  );
  
  const { data: config } = useDoc<GlobalConfig>(configRef);

  const finalFaviconUrl = sourceType === 'platform' ? config?.faviconUrl : propFaviconUrl;
  const finalTitle = sourceType === 'platform' ? (config?.name || 'Markix Platform') : (propTitle || 'Markix');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Guardar estado actual antes de aplicar cambios para el cleanup
    const prevTitle = document.title;
    const existingIcon = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    const prevIconHref = existingIcon?.href || '';
    const appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
    const prevAppleHref = appleLink?.href || '';

    // Actualizar el título de la pestaña
    if (finalTitle && document.title !== finalTitle) {
      document.title = finalTitle;
    }

    const updateFavicon = (url: string) => {
      try {
        const head = document.getElementsByTagName('head')[0];
        if (!head) return;

        let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        if (link) {
          link.href = url;
        } else {
          link = document.createElement('link');
          link.rel = 'icon';
          link.href = url;
          head.appendChild(link);
        }

        let appleIcon = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
        if (appleIcon) {
          appleIcon.href = url;
        } else {
          appleIcon = document.createElement('link');
          appleIcon.rel = 'apple-touch-icon';
          appleIcon.href = url;
          head.appendChild(appleIcon);
        }
      } catch (e) {
        console.warn('[FaviconInjector] Failed to update icon:', e);
      }
    };

    if (finalFaviconUrl) {
      updateFavicon(finalFaviconUrl);
    }

    // LÓGICA DE LIMPIEZA (CLEANUP)
    // Solo restauramos si es una inyección manual (página de negocio/catálogo).
    // El inyector de 'platform' en el RootLayout debe persistir.
    return () => {
      if (sourceType === 'manual') {
        if (prevTitle) document.title = prevTitle;
        
        const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        if (link && prevIconHref) link.href = prevIconHref;
        
        const apple = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
        if (apple && prevAppleHref) apple.href = prevAppleHref;
      }
    };
    
  }, [finalFaviconUrl, finalTitle, pathname, sourceType]);

  return null;
}
