import { getAdminFirestore } from "@/firebase/server-init";
import type { SubscriptionPlan } from "@/models/subscription-plan";
import type { HybridPlan } from "@/models/hybrid-plan";
import type { LandingPageData } from "@/models/landing-page";
import PublicPlanCard from "@/components/pricing/public-plan-card";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

export const dynamic = 'force-dynamic';

/**
 * Obtiene los planes estándar de la colección 'plans'.
 */
async function getPlans(): Promise<SubscriptionPlan[]> {
    try {
        const db = await getAdminFirestore();
        const q = db.collection("plans").orderBy("price", "asc");
        const snapshot = await q.get();
        
        if (snapshot.empty) return [];
        
        return snapshot.docs
          .map(doc => ({ ...doc.data(), id: doc.id } as SubscriptionPlan))
          .filter(plan => plan.isActive === true);
    } catch (error) {
        console.error("Error fetching standard plans:", error);
        return [];
    }
}

/**
 * Obtiene los planes híbridos de la colección 'hybrid_plans'.
 * Replicado exactamente de src/app/page.tsx
 */
async function getHybridPlans(): Promise<HybridPlan[]> {
  try {
    const db = await getAdminFirestore();
    const snapshot = await db.collection("hybrid_plans").get();
    
    if (snapshot.empty) return [];
    
    return snapshot.docs
      .map(doc => ({ ...doc.data(), id: doc.id } as HybridPlan))
      .sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));
  } catch (error) {
    console.error("[getHybridPlans] Error:", error);
    return [];
  }
}

async function getHeaderData(): Promise<{ businessId: string | null, navigation: LandingPageData['navigation'] | null }> {
    try {
        const db = await getAdminFirestore();
        const configSnap = await db.collection("globalConfig").doc("system").get();
        const mainBusinessId = configSnap.exists ? configSnap.data()?.mainBusinessId : null;

        if (!mainBusinessId) {
            return { businessId: null, navigation: null };
        }

        const landingSnap = await db.collection("businesses").doc(mainBusinessId).collection("landingPages").doc("main").get();
        const navigation = landingSnap.exists ? (landingSnap.data() as LandingPageData).navigation : null;
        
        return { businessId: mainBusinessId, navigation };
    } catch (error) {
        console.error("Error fetching header data:", error);
        return { businessId: null, navigation: null };
    }
}

export default async function PricingPage() {
    // Ejecución de queries en paralelo para optimizar performance
    const [plansResult, hybridPlansResult, headerDataResult] = await Promise.allSettled([
      getPlans(),
      getHybridPlans(),
      getHeaderData()
    ]);

    const plans = plansResult.status === 'fulfilled' ? plansResult.value : [];
    const hybridPlans = hybridPlansResult.status === 'fulfilled' ? hybridPlansResult.value : [];
    const headerData = headerDataResult.status === 'fulfilled' ? headerDataResult.value : { businessId: null, navigation: null };

    // Normalización de planes híbridos para compatibilidad con PublicPlanCard
    const normalizedHybrid = hybridPlans.map(hp => ({
        ...hp,
        price: hp.basePrice, // Mapeamos basePrice a price para el componente visual
        description: hp.isActive ? `Plan híbrido: Pago base + comisión por pedido.` : 'Plan no disponible actualmente.'
    }));

    // Unificamos las colecciones (híbridos primero según patrón de la landing)
    const allPlans = [...normalizedHybrid, ...plans];
    const { businessId, navigation } = headerData;

    return (
        <div className="w-full bg-background min-h-screen flex flex-col">
            <Header businessId={businessId} navigation={navigation} />
            <main className="container mx-auto px-4 py-16 md:py-24 flex-1">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-gray-900">Planes para cada necesidad</h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Elige el plan que mejor se adapte al crecimiento de tu negocio. El código de referido se aplicará automáticamente al registrarte.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start max-w-5xl mx-auto">
                    {allPlans.length > 0 ? (
                        allPlans.map((plan) => (
                            <PublicPlanCard key={plan.id} plan={plan as any} />
                        ))
                    ) : (
                        <div className="col-span-full text-center py-20 bg-muted/20 rounded-3xl border border-dashed">
                            <p className="text-muted-foreground font-medium">No hay planes disponibles actualmente en el sistema.</p>
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
