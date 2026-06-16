'use client';

import { useEffect } from 'react';

/**
 * Inyecta dinámicamente el favicon y el título en el head del documento.
 * Maneja URLs externas y Base64.
 */
export default function FaviconInjector({ 
  faviconUrl, 
  title 
}: { 
  faviconUrl?: string | null;
  title?: string | null;
}) {
  useEffect(() => {
    // 1. Actualizar el título de la pestaña
    if (title) {
      document.title = title;
    }

    // 2. Actualizar el Favicon
    if (!faviconUrl) return;

    // Eliminar favicons y apple-touch-icons previos para evitar conflictos de caché
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
    
  }, [faviconUrl, title]);

  return null;
}
