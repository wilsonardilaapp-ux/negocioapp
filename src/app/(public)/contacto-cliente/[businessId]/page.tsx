import { getAdminFirestore } from '@/firebase/server-init';
import Header from "@/components/layout/header";
import type { LandingPageData } from '@/models/landing-page';
import ContactClientForm from './form'; // Import the new client component

async function getPageData(businessId: string): Promise<{ businessId: string | null, navigation: LandingPageData['navigation'] | null }> {
    try {
        const db = await getAdminFirestore();
        
        // Use the passed businessId to fetch ITS navigation, not the main one.
        // If it doesn't have one, we can fall back to the main one.
        let navData: LandingPageData['navigation'] | null = null;
        const landingSnap = await db.collection("businesses").doc(businessId).collection("landingPages").doc("main").get();
        
        if (landingSnap.exists()) {
             navData = (landingSnap.data() as LandingPageData).navigation;
        } else {
            // Fallback to main business navigation if the specific business doesn't have one
            const configSnap = await db.collection("globalConfig").doc("system").get();
            const mainBusinessId = configSnap.exists ? configSnap.data()?.mainBusinessId : null;
            if (mainBusinessId) {
                const mainLandingSnap = await db.collection("businesses").doc(mainBusinessId).collection("landingPages").doc("main").get();
                 if (mainLandingSnap.exists()) {
                    navData = (mainLandingSnap.data() as LandingPageData).navigation;
                 }
            }
        }
        
        return { businessId, navigation: navData };
    } catch (error) {
        console.error("Error fetching header data:", error);
        return { businessId, navigation: null };
    }
}

export default async function ContactoClientePage({ params }: { params: { businessId: string }}) {
    const { businessId } = params;
    const { navigation } = await getPageData(businessId);

    return (
        <div className="w-full min-h-screen bg-gray-50/50">
            <Header businessId={businessId} navigation={navigation} />
            <main className="container mx-auto px-4 py-16">
                <div className="w-full max-w-2xl mx-auto">
                    <ContactClientForm businessId={businessId} />
                </div>
            </main>
        </div>
    );
}
