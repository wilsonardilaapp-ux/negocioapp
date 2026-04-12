import { getAdminFirestore } from "@/firebase/server-init";
import type { SubscriptionPlan } from "@/models/subscription-plan";
import type { LandingPageData } from "@/models/landing-page";
import PublicPlanCard from "@/components/pricing/public-plan-card";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

async function getPlans(): Promise<SubscriptionPlan[]> {
    try {
        const db = await getAdminFirestore();
        const q = db.collection("plans").orderBy("price", "asc");
        const snapshot = await q.get();
        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as SubscriptionPlan[];
    } catch (error) {
        console.error("Error fetching plans:", error);
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
    const plans = await getPlans();
    const { businessId, navigation } = await getHeaderData();

    return (
        <div className="w-full bg-background">
            <Header businessId={businessId} navigation={navigation} />
            <main className="container mx-auto px-4 py-16 md:py-24">
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Planes para cada necesidad</h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Elige el plan que mejor se adapte al crecimiento de tu negocio.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start max-w-5xl mx-auto">
                    {plans.map(plan => (
                        <PublicPlanCard key={plan.id} plan={plan} />
                    ))}
                </div>
            </main>
            <Footer />
        </div>
    );
}
