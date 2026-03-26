
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, getDocs } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";
import type { SubscriptionPlan } from "@/models/subscription-plan";
import PublicPlanCard from "@/components/pricing/public-plan-card";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

async function getPlans(): Promise<SubscriptionPlan[]> {
    try {
        const q = query(collection(db, "plans"), orderBy("price", "asc"));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as SubscriptionPlan[];
    } catch (error) {
        console.error("Error fetching plans:", error);
        return [];
    }
}

export default async function PricingPage() {
    const plans = await getPlans();

    return (
        <div className="w-full bg-background">
            <Header />
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
