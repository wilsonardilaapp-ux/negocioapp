'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { GlobalConfig } from '@/models/global-config';
import { useFaviconOverride } from '@/context/FaviconOverrideContext';

/**
 * Inyecta dinámicamente el favicon y el título en el head del documento.
 * Incluye lógica de coordinación para evitar colisiones entre el branding
 * global y el específico de negocios.
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
  const { hasManualOverride, setHasManualOverride } = useFaviconOverride();

  const configRef = useMemoFirebase(() => 
    sourceType === 'platform' ? doc(firestore, 'globalConfig', 'system') : null, 
    [firestore, sourceType]
  );
  
  const { data: config } = useDoc<GlobalConfig>(configRef);

  const finalFaviconUrl = sourceType === 'platform' ? config?.faviconUrl : propFaviconUrl;
  const finalTitle = sourceType === 'platform' ? (config?.name || 'Markix Platform') : (propTitle || 'Markix');

  // EFECTO 1: Gestión de la señal de anulación
  useEffect(() => {
    if (sourceType === 'manual') {
      setHasManualOverride(true);
      return () => setHasManualOverride(false);
    }
  }, [sourceType, setHasManualOverride]);

  // EFECTO 2: Inyección en el DOM
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // BLOQUEO DE SEGURIDAD: Si soy el inyector de plataforma y hay un negocio activo, no hago nada.
    // Esto evita el flicker y que la plataforma sobreescriba al negocio cuando Firestore resuelve.
    if (sourceType === 'platform' && hasManualOverride) {
      return;
    }

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
    return () => {
      if (sourceType === 'manual') {
        if (prevTitle) document.title = prevTitle;
        
        const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        if (link && prevIconHref) link.href = prevIconHref;
        
        const apple = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement;
        if (apple && prevAppleHref) apple.href = prevAppleHref;
      }
    };
    
  }, [finalFaviconUrl, finalTitle, pathname, sourceType, hasManualOverride]);

  return null;
}
