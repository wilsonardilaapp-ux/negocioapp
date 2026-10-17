'use client';

import React from 'react';
import type { SocialProofProductMetrics } from '@/models/social-proof';

interface Props {
  metrics?: SocialProofProductMetrics;
}

export default function SocialProofBadge({ metrics }: Props) {
  if (!metrics) return null;

  const { showRecentSales, showLiveViewers, salesLast12Hours, liveViewers } = metrics;
  if (!showRecentSales && !showLiveViewers) return null;

  return (
    <div className="flex flex-col gap-1 pt-1.5 pb-0.5 animate-in fade-in duration-300">
      {showRecentSales && (
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/40 text-[11px] font-semibold text-orange-700 dark:text-orange-300 w-fit">
          <span className="text-xs">🔥</span>
          <span><strong className="font-extrabold">{salesLast12Hours}</strong> vendidos en las últimas 12 horas</span>
        </div>
      )}

      {showLiveViewers && (
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 text-[11px] font-semibold text-blue-700 dark:text-blue-300 w-fit">
          <span className="text-xs">👀</span>
          <span><strong className="font-extrabold">{liveViewers}</strong> personas están mirando</span>
        </div>
      )}
    </div>
  );
}
