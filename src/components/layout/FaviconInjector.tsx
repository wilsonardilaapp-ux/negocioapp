'use client';

import { useEffect } from 'react';

/**
 * Inyecta dinámicamente el favicon en el head del documento.
 * Útil para SaaS donde el favicon cambia según el cliente y puede ser un string Base64.
 */
export default function FaviconInjector({ faviconUrl }: { faviconUrl?: string | null }) {
  useEffect(() => {
    if (!faviconUrl) return;

    // Buscar el link del favicon existente
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    
    // Si no existe, crearlo
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }

    // Actualizar la ruta del icono (soporta URL y Base64)
    link.href = faviconUrl;
    
    // Opcional: También para apple-touch-icon
    let appleLink: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
    if (appleLink) {
        appleLink.href = faviconUrl;
    }
  }, [faviconUrl]);

  return null;
}
