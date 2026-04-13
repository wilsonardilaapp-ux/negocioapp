import { getAdminFirestore } from '@/firebase/server-init';
import Header from "@/components/layout/header";
import type { LandingPageData } from '@/models/landing-page';
import ContactClientForm from './form';

async function getPageData(businessId: string): Promise<{ businessId: string | null, navigation: LandingPageData['navigation'] | null }> {
    if (!businessId) {
        return { businessId: null, navigation: null };
    }
    try {
        const db = await getAdminFirestore();
        // Fetch the navigation directly from the specific business's landing page document.
        const landingSnap = await db.collection("businesses").doc(businessId).collection("landingPages").doc("main").get();
        
        // Use the property `.exists` because we are using the Admin SDK
        const navigation = landingSnap.exists ? (landingSnap.data() as LandingPageData).navigation : null;
        
        return { businessId, navigation };
    } catch (error) {
        console.error(`Error fetching header data for business ${businessId}:`, error);
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
