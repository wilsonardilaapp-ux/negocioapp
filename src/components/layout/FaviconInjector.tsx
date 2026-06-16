'use client';

import { useEffect } from 'react';

/**
 * Inyecta dinámicamente el favicon en el head del documento.
 * Limpia iconos previos para asegurar que el branding del cliente SaaS prevalezca.
 */
export default function FaviconInjector({ faviconUrl }: { faviconUrl?: string | null }) {
  useEffect(() => {
    if (!faviconUrl) return;

    // Eliminar favicons y apple-touch-icons previos para evitar conflictos de caché del navegador
    const existingIcons = document.querySelectorAll("link[rel~='icon'], link[rel='apple-touch-icon']");
    existingIcons.forEach(el => el.parentNode?.removeChild(el));

    // Crear e inyectar el nuevo favicon (soporta URL y Base64)
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = faviconUrl;
    document.head.appendChild(link);

    // Inyectar apple-touch-icon para dispositivos iOS
    const appleLink = document.createElement('link');
    appleLink.rel = 'apple-touch-icon';
    appleLink.href = faviconUrl;
    document.head.appendChild(appleLink);
    
  }, [faviconUrl]);

  return null;
}
