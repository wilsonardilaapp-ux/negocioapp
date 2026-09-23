const fs = require('fs');
const filePath = 'src/app/(dashboard)/dashboard/catalogo/page.tsx';

let content = fs.readFileSync(filePath, 'utf8');

// 1. Quitar el import duplicado de Badge
content = content.replace(
  `import { type PricingContext, obtenerTasaComisionHibrida } from '@/constants/pricingPlans';\nimport { Badge } from '@/components/ui/badge';`,
  `import { type PricingContext, obtenerTasaComisionHibrida } from '@/constants/pricingPlans';`
);

// 2. Manejar plan como string o como objeto con seguridad de tipos
const oldMemoCode = `    const pricingContext: PricingContext = useMemo(() => {
        const type = businessData?.planType || (plan?.name?.toLowerCase().includes('crecimiento') || plan?.name?.toLowerCase().includes('estándar') || plan?.name?.toLowerCase().includes('profesional') || plan?.name?.toLowerCase().includes('básico') ? 'hibrido' : 'fijo');
        return {
            planType: type,
            planName: businessData?.planName || plan?.name,
            planSlug: (plan as any)?.slug,
            comisionRate: (plan as any)?.comision || (plan as any)?.commission,
        };
    }, [businessData, plan]);`;

const safeMemoCode = `    const pricingContext: PricingContext = useMemo(() => {
        const pName = typeof plan === 'string' ? plan : ((plan as any)?.name || '');
        const pLower = pName.toLowerCase();
        const isHybrid = pLower.includes('crecimiento') || pLower.includes('estándar') || pLower.includes('profesional') || pLower.includes('básico');
        const type = businessData?.planType || (isHybrid ? 'hibrido' : 'fijo');
        return {
            planType: type,
            planName: businessData?.planName || pName || 'Plan Estándar',
            planSlug: (plan as any)?.slug,
            comisionRate: (plan as any)?.comision || (plan as any)?.commission,
        };
    }, [businessData, plan]);`;

content = content.replace(oldMemoCode, safeMemoCode);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Corrección aplicada.');
