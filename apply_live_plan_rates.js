const fs = require('fs');
const filePath = 'src/app/(public)/catalog/[businessId]/page.tsx';

let content = fs.readFileSync(filePath, 'utf8');

// 1. Asegurar import de HybridPlan
if (!content.includes("from '@/models/hybrid-plan'")) {
  content = content.replace(
    "import type { Business } from '@/models/business';",
    "import type { Business } from '@/models/business';\nimport type { HybridPlan } from '@/models/hybrid-plan';"
  );
}

// 2. Extender pageData state para incluir planConfig
content = content.replace(
  "business: Business | null;\n    }>({ headerConfig: null,",
  "business: Business | null;\n        planConfig?: HybridPlan | null;\n    }>({ headerConfig: null,"
);

content = content.replace(
  "business: null,\n    });",
  "business: null,\n        planConfig: null,\n    });"
);

// 3. Consultar hybrid_plans en Promise.all y hacer match del plan activo
const oldPromiseAll = `const [catalogSnap, paymentSnap, couponsSnap, businessSnap] = await Promise.all([
                    getDoc(publicCatalogRef),
                    getDoc(paymentSettingsRef),
                    getDocs(couponsQuery),
                    getDoc(businessRef),
                ]);`;

const newPromiseAll = `const hybridPlansRef = collection(firestore, 'hybrid_plans');
                const [catalogSnap, paymentSnap, couponsSnap, businessSnap, hybridPlansSnap] = await Promise.all([
                    getDoc(publicCatalogRef),
                    getDoc(paymentSettingsRef),
                    getDocs(couponsQuery),
                    getDoc(businessRef),
                    getDocs(hybridPlansRef),
                ]);`;

content = content.replace(oldPromiseAll, newPromiseAll);

// 4. Mapear matchedPlan en setPageData
const oldSetPageData = `resolvedBusinessId: businessId,
                    business: businessSnap.exists() ? (businessSnap.data() as Business) : null,
                });`;

const newSetPageData = `const businessData = businessSnap.exists() ? (businessSnap.data() as Business) : null;
                const hybridPlansList = hybridPlansSnap.docs.map(d => ({ ...d.data(), id: d.id } as HybridPlan));
                const planKey = String(businessData?.planName || '').toLowerCase().trim();
                const matchedPlan = hybridPlansList.find(p => 
                    p.id.toLowerCase() === planKey || 
                    (p.name && p.name.toLowerCase().trim() === planKey) ||
                    (p.slug && p.slug.toLowerCase().trim() === planKey)
                ) || null;

                setPageData({
                    headerConfig: data.headerConfig as LandingHeaderConfigData,
                    products: data.products as Product[],
                    promotions: (data.promotions as Promotion[]) || [],
                    coupons: couponsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon)),
                    paymentSettings: paymentSnap.exists() ? (paymentSnap.data() as PaymentSettings) : null,
                    resolvedBusinessId: businessId,
                    business: businessData,
                    planConfig: matchedPlan,
                });`;

content = content.replace(oldSetPageData, newSetPageData);

// 5. Inyectar comisionRate y tableCommissionRate del planConfig en pricingContext
const oldPricingContext = `const pricingContext: PricingContext = useMemo(() => {
        return {
            planType: pageData.business?.planType || 'fijo',
            planName: pageData.business?.planName,
            planSlug: (pageData.business as any)?.planSlug,
            channel: activeCanal,
        };
    }, [pageData.business, activeCanal]);`;

const newPricingContext = `const pricingContext: PricingContext = useMemo(() => {
        return {
            planType: pageData.business?.planType || (pageData.planConfig ? 'hibrido' : 'fijo'),
            planName: pageData.business?.planName || pageData.planConfig?.name,
            planSlug: (pageData.business as any)?.planSlug || pageData.planConfig?.slug,
            comisionRate: pageData.planConfig?.pricePerOrder,
            tableCommissionRate: pageData.planConfig?.tableCommissionRate,
            channel: activeCanal,
        };
    }, [pageData.business, pageData.planConfig, activeCanal]);`;

content = content.replace(oldPricingContext, newPricingContext);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Lectura en vivo de comisiones del plan aplicada.');
