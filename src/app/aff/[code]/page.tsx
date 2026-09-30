'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function AffiliateCapturePage() {
  const params = useParams();
  const router = useRouter();

  React.useEffect(() => {
    const rawCode = params?.code;
    if (!rawCode) {
      router.replace('/');
      return;
    }

    const code = String(rawCode).trim().toUpperCase();

    // 1. Guardar en localStorage y Cookie por 30 días
    try {
      localStorage.setItem('partnerverse_aff_code', code);
      document.cookie = `partnerverse_aff_code=${code}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
    } catch (e) {
      console.warn('[Affiliate] Error guardando cookie:', e);
    }

    // 2. Reportar el clic en segundo plano a PartnerVerse
    const reportClick = async () => {
      try {
        const endpoint = process.env.NEXT_PUBLIC_PARTNERVERSE_CLICK_URL || 'https://partner-comercial-senior.vercel.app/api/affiliate/track-click';
        const apiKey = process.env.NEXT_PUBLIC_AFFILIATE_API_KEY || 'aff_live_partnerverse_2026_sec_key_9f8a';

        await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
          body: JSON.stringify({
            code,
            platform: 'MARKIX',
          }),
        });
      } catch (err) {
        console.warn('[Affiliate] Error reportando clic:', err);
      } finally {
        // Redirigir siempre a la landing page pública de Markix
        router.replace('/');
      }
    };

    reportClick();
  }, [params, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        <p className="text-xs text-slate-500 font-medium animate-pulse">Conectando con Markix...</p>
      </div>
    </div>
  );
}
