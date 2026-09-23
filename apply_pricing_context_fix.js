const fs = require('fs');

// 1. MODIFICAR src/app/(public)/catalog/[businessId]/page.tsx
const pagePath = 'src/app/(public)/catalog/[businessId]/page.tsx';
let pageContent = fs.readFileSync(pagePath, 'utf8');

const targetOldBlock = `    // Captura de origen de la URL (ej. ?ref=qr)
    
    const pricingContext: PricingContext = useMemo(() => {
        return {
            planType: pageData.business?.planType || 'fijo',
            planName: pageData.business?.planName,
            planSlug: (pageData.business as any)?.planSlug,
        };
    }, [pageData.business]);
  
    const orderOrigin = useMemo(() => {
        return searchParams.get('ref') || 'web';
    }, [searchParams]);`;

const newTargetBlock = `    // Captura de origen de la URL (ej. ?ref=qr)
    const orderOrigin = useMemo(() => {
        return searchParams.get('ref') || 'web';
    }, [searchParams]);

    const isMesaChannel = orderOrigin === 'qr' || orderOrigin === 'mesa';
    const activeCanal = isMesaChannel ? 'mesa' : 'domicilio';

    const pricingContext: PricingContext = useMemo(() => {
        return {
            planType: pageData.business?.planType || (pageData.planConfig ? 'hibrido' : 'fijo'),
            planName: pageData.business?.planName || pageData.planConfig?.name,
            planSlug: (pageData.business as any)?.planSlug || pageData.planConfig?.slug,
            comisionRate: pageData.planConfig?.pricePerOrder,
            tableCommissionRate: pageData.planConfig?.tableCommissionRate,
            channel: activeCanal,
        };
    }, [pageData.business, pageData.planConfig, activeCanal]);`;

if (pageContent.includes(targetOldBlock)) {
  pageContent = pageContent.replace(targetOldBlock, newTargetBlock);
  fs.writeFileSync(pagePath, pageContent, 'utf8');
  console.log('✅ pricingContext actualizado con comisionRate y canal en page.tsx');
} else {
  console.log('⚠️ Bloque en page.tsx no coincidió exactamente por formato de espacios.');
}

// 2. ACTUALIZAR src/constants/pricingPlans.ts con fallback para 'estandar' y 'basico'
const pricingPath = 'src/constants/pricingPlans.ts';
let pricingContent = fs.readFileSync(pricingPath, 'utf8');

const targetIdentifier = `if (identifier.includes('unlimited') || identifier.includes('ilimitado')) return PORCENTAJES_HIBRIDOS.unlimited;`;
const newIdentifier = `if (identifier.includes('unlimited') || identifier.includes('ilimitado')) return PORCENTAJES_HIBRIDOS.unlimited;
  if (identifier.includes('estandar') || identifier.includes('estándar') || identifier.includes('basico') || identifier.includes('básico')) return 0.04;`;

if (!pricingContent.includes("includes('estandar')")) {
  pricingContent = pricingContent.replace(targetIdentifier, newIdentifier);
  fs.writeFileSync(pricingPath, pricingContent, 'utf8');
  console.log('✅ Fallback para Plan Estándar / Básico agregado en pricingPlans.ts');
}

