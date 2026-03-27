'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import type { LandingPageData } from '@/models/landing-page';
import { revalidatePath } from 'next/cache';

export async function saveLandingConfig(data: LandingPageData): Promise<{ success: boolean; error?: string }> {
  try {
    const firestore = await getAdminFirestore();
    const docRef = firestore.collection('landing_configs').doc('main');
    
    // Cleaning the data to remove any `undefined` values that Firestore Admin SDK cannot serialize.
    const cleanData = JSON.parse(JSON.stringify(data));

    // Overwrite the document completely to ensure no old fields remain.
    await docRef.set(cleanData);
    
    // Revalidate BOTH the home page and the editor page path to ensure the cache is cleared.
    revalidatePath('/');
    revalidatePath('/superadmin/landing-public');
    
    return { success: true };
  } catch (error: any) {
    console.error("Error saving landing config via server action:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches landing page data from Firestore using the Admin SDK.
 * This function runs on the server.
 * @returns {Promise<LandingPageData | null>} The landing page data or null if an error occurs or the doc doesn't exist.
 */
export async function getLandingConfig(): Promise<LandingPageData | null> {
    try {
        const firestore = await getAdminFirestore();
        const docRef = firestore.collection('landing_configs').doc('main');
        const docSnap = await docRef.get();

        if (docSnap.exists()) {
            return docSnap.data() as LandingPageData;
        }
        console.log("Document 'landing_configs/main' does not exist.");
        return null;
    } catch (error) {
        console.error("Critical error fetching landing data via Admin SDK:", error);
        return null;
    }
}
