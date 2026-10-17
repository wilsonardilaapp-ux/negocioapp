const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

console.log('====================================================');
console.log('🚀 FASE 6: CREACIÓN DE BADGE Y MONTAJE EN TARJETA');
console.log('====================================================\n');

// 1. CREAR src/components/catalogo/SocialProofBadge.tsx
const badgePath = path.join(ROOT, 'src', 'components', 'catalogo', 'SocialProofBadge.tsx');
const badgeContent = `'use client';

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
`;

fs.writeFileSync(badgePath, badgeContent, 'utf8');
console.log('✅ Creado componente: src/components/catalogo/SocialProofBadge.tsx');

// 2. MODIFICAR public-product-card.tsx (CON BACKUP .bak)
const cardPath = path.join(ROOT, 'src', 'components', 'catalogo', 'public-product-card.tsx');
const cardBackup = path.join(ROOT, 'src', 'components', 'catalogo', 'public-product-card.tsx.bak');

if (!fs.existsSync(cardPath)) {
  console.error(`❌ No existe ${cardPath}`);
  process.exit(1);
}

fs.copyFileSync(cardPath, cardBackup);
console.log('📦 Respaldo creado: src/components/catalogo/public-product-card.tsx.bak');

let cardContent = fs.readFileSync(cardPath, 'utf8');

// Agregar import de SocialProofBadge y SocialProofProductMetrics
if (!cardContent.includes('SocialProofBadge')) {
  cardContent = `import SocialProofBadge from './SocialProofBadge';\nimport type { SocialProofProductMetrics } from '@/models/social-proof';\n` + cardContent;
}

// Agregar socialProof a la interface PublicProductCardProps
if (!cardContent.includes('socialProof?: SocialProofProductMetrics;')) {
  cardContent = cardContent.replace(
    'planContext?: PricingContext;',
    `planContext?: PricingContext;\n  socialProof?: SocialProofProductMetrics;`
  );
}

// Agregar prop socialProof a la firma de función
if (!cardContent.includes('socialProof,')) {
  cardContent = cardContent.replace(
    'planContext }: PublicProductCardProps',
    'planContext, socialProof }: PublicProductCardProps'
  );
}

// Inyectar el badge justo debajo del bloque de precio (antes de </CardContent>)
const priceEndMarker = '        </div>\n      </CardContent>';
if (cardContent.includes(priceEndMarker) && !cardContent.includes('<SocialProofBadge')) {
  cardContent = cardContent.replace(
    priceEndMarker,
    `        </div>\n        <SocialProofBadge metrics={socialProof} />\n      </CardContent>`
  );
  console.log('✅ <SocialProofBadge /> inyectado debajo del precio.');
}

fs.writeFileSync(cardPath, cardContent, 'utf8');
console.log('✅ Archivo public-product-card.tsx actualizado exitosamente.');
