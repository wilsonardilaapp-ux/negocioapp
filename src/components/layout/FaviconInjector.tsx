'use client';

import { useEffect } from 'react';

/**
 * Inyecta dinámicamente el favicon y el título en el head del documento.
 * Utiliza una estrategia de actualización (update-or-append) para evitar errores 
 * de reconciliación en React (removeChild on null).
 */
export default function FaviconInjector({ 
  faviconUrl, 
  title 
}: { 
  faviconUrl?: string | null;
  title?: string | null;
}) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Actualizar el título de la pestaña de forma segura
    if (title && document.title !== title) {
      document.title = title;
    }

    // 2. Actualizar el Favicon
    if (!faviconUrl) return;

    const updateFavicon = (url: string) => {
      // Intentar encontrar el link existente de favicon (rel icon o shortcut icon)
      let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      
      if (link) {
        // Si existe, solo actualizamos el href (esto no rompe la reconciliación de React)
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

    updateFavicon(faviconUrl);
    
  }, [faviconUrl, title]);

  return null;
}
