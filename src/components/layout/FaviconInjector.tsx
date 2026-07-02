
'use client';

import { useEffect } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { GlobalConfig } from '@/models/global-config';

/**
 * Inyecta dinámicamente el favicon y el título en el head del documento.
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

  const configRef = useMemoFirebase(() => 
    sourceType === 'platform' ? doc(firestore, 'globalConfig', 'system') : null, 
    [firestore, sourceType]
  );
  
  const { data: config } = useDoc<GlobalConfig>(configRef);

  const finalFaviconUrl = sourceType === 'platform' ? config?.faviconUrl : propFaviconUrl;
  const finalTitle = sourceType === 'platform' ? (config?.name || 'Markix Platform') : (propTitle || 'Markix');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Actualizar el título de la pestaña de forma segura
    if (finalTitle && document.title !== finalTitle) {
      document.title = finalTitle;
    }

    if (!finalFaviconUrl) return;

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

        let appleLink = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
        if (appleLink) {
          appleLink.href = url;
        } else {
          appleLink = document.createElement('link');
          appleLink.rel = 'apple-touch-icon';
          appleLink.href = url;
          head.appendChild(appleLink);
        }
      } catch (e) {
        console.warn('[FaviconInjector] Failed to update icon:', e);
      }
    };

    updateFavicon(finalFaviconUrl);
    
  }, [finalFaviconUrl, finalTitle]);

  return null;
}
