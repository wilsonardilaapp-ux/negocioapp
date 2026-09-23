const fs = require('fs');
const filePath = 'src/app/(public)/catalog/[businessId]/page.tsx';

let content = fs.readFileSync(filePath, 'utf8');

const brokenBlock = `                const data = catalogSnap.data();
                setPageData({
                    headerConfig: data.headerConfig as LandingHeaderConfigData,
                    products: data.products as Product[],
                    promotions: (data.promotions as Promotion[]) || [],
                    coupons: couponsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon)),
                    paymentSettings: paymentSnap.exists() ? (paymentSnap.data() as PaymentSettings) : null,
                    const businessData = businessSnap.exists() ? (businessSnap.data() as Business) : null;
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

const cleanBlock = `                const data = catalogSnap.data();
                const businessData = businessSnap.exists() ? (businessSnap.data() as Business) : null;
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

content = content.replace(brokenBlock, cleanBlock);
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Bloque setPageData normalizado.');
