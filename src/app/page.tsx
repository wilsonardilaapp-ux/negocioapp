
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, query, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";
import type { LandingPageData } from "@/models/landing-page";
import LandingPageContent from "@/components/landing-page/landing-page-content";
import { ChatbotWidget } from "@/components/chatbot/chatbot-widget";
import type { Module } from "@/models/module";

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

async function getLandingPageData(): Promise<{ 
    landingData: LandingPageData | null,
    businessId: string | null,
    chatbot: {
        enabled: boolean;
        businessName: string;
        avatarUrl: string;
        greeting: string;
    } | null
}> {
    try {
        const landingSnap = await getDoc(doc(db, "landing_configs", "main"));
        const landingData = landingSnap.exists() ? (landingSnap.data() as LandingPageData) : null;
        
        // We still need a businessId for the chatbot, let's use the global one if available.
        const configSnap = await getDoc(doc(db, "globalConfig", "system"));
        const mainBusinessId = configSnap.exists() ? configSnap.data().mainBusinessId : null;

        const chatbotModuleSnap = await getDoc(doc(db, 'modules', 'chatbot-integrado-con-whatsapp-para-soporte-y-ventas'));
        const isChatbotEnabled = chatbotModuleSnap.exists() ? chatbotModuleSnap.data().status === 'active' : false;
        
        const chatbotData = (isChatbotEnabled && landingData) ? {
            enabled: true,
            businessName: landingData.header?.businessInfo?.name || 'Asistente',
            avatarUrl: landingData.chatbot?.avatarUrl || '',
            greeting: landingData.chatbot?.greeting || '¡Hola! ¿En qué puedo ayudarte?',
        } : null;

        return { 
            landingData, 
            businessId: mainBusinessId,
            chatbot: chatbotData
        };
    } catch (error) {
        console.error("Error fetching landing page data:", error);
        return { landingData: null, businessId: null, chatbot: null };
    }
}


export default async function RootPage() {
    const { landingData, businessId, chatbot } = await getLandingPageData();

    if (!landingData) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center text-center">
                 <h1 className="text-2xl font-bold">Página en Construcción</h1>
                 <p className="text-muted-foreground">La página principal aún no ha sido configurada por el administrador.</p>
            </div>
        )
    }

    return (
        <div className="w-full bg-background">
            <LandingPageContent data={landingData} />
            
            {chatbot && businessId && (
                 <ChatbotWidget 
                    enabled={chatbot.enabled}
                    businessId={businessId}
                    businessName={chatbot.businessName}
                    avatarUrl={chatbot.avatarUrl}
                    greeting={chatbot.greeting}
                />
            )}
        </div>
    );
}
