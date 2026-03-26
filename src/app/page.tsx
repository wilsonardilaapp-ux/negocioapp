
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";
import type { SubscriptionPlan } from "@/models/subscription-plan";
import type { LandingPageData } from "@/models/landing-page";
import PublicPlanCard from "@/components/pricing/public-plan-card";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { ChatbotWidget } from "@/components/chatbot/chatbot-widget";
import type { Module } from "@/models/module";

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

async function getHomePageData(): Promise<{ 
    businessId: string | null, 
    navigation: LandingPageData['navigation'] | null,
    chatbot: {
        enabled: boolean;
        businessName: string;
        avatarUrl: string;
        greeting: string;
    } | null
}> {
    try {
        const configSnap = await getDoc(doc(db, "globalConfig", "system"));
        const mainBusinessId = configSnap.exists() ? configSnap.data().mainBusinessId : null;

        if (!mainBusinessId) {
            return { businessId: null, navigation: null, chatbot: null };
        }

        const landingSnap = await getDoc(doc(db, "businesses", mainBusinessId, "landingPages", "main"));
        const landingData = landingSnap.exists() ? (landingSnap.data() as LandingPageData) : null;
        
        const chatbotModuleSnap = await getDoc(doc(db, 'modules', 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas'));
        const isChatbotEnabled = chatbotModuleSnap.exists() ? chatbotModuleSnap.data().status === 'active' : false;
        
        const chatbotData = isChatbotEnabled ? {
            enabled: true,
            businessName: landingData?.header?.businessInfo?.name || 'Asistente',
            avatarUrl: landingData?.chatbot?.avatarUrl || '',
            greeting: landingData?.chatbot?.greeting || '¡Hola! ¿En qué puedo ayudarte?',
        } : null;

        return { 
            businessId: mainBusinessId, 
            navigation: landingData?.navigation || null,
            chatbot: chatbotData
        };
    } catch (error) {
        console.error("Error fetching home page data:", error);
        return { businessId: null, navigation: null, chatbot: null };
    }
}


export default async function RootPage() {
    const plans = await getPlans();
    const { businessId, navigation, chatbot } = await getHomePageData();

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

                {plans.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start max-w-5xl mx-auto">
                        {plans.map(plan => (
                            <PublicPlanCard key={plan.id} plan={plan} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <p className="text-muted-foreground">No hay planes de suscripción disponibles en este momento.</p>
                        <p className="text-sm text-muted-foreground">Por favor, contacta al administrador.</p>
                    </div>
                )}
            </main>
            
            {chatbot && businessId && (
                 <ChatbotWidget 
                    enabled={chatbot.enabled}
                    businessId={businessId}
                    businessName={chatbot.businessName}
                    avatarUrl={chatbot.avatarUrl}
                    greeting={chatbot.greeting}
                />
            )}
            
            <Footer />
        </div>
    );
}
