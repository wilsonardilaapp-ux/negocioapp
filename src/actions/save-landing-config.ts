
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

    await docRef.set(cleanData);
    
    revalidatePath('/');
    
    return { success: true };
  } catch (error: any) {
    console.error("Error saving landing config via server action:", error);
    return { success: false, error: error.message };
  }
}

export async function getLandingConfig(): Promise<LandingPageData | null> {
    try {
        const firestore = await getAdminFirestore();
        const docRef = firestore.collection('landing_configs').doc('main');
        const docSnap = await docRef.get();

        if (docSnap.exists()) {
            return docSnap.data() as LandingPageData;
        }
        return null;
    } catch (error) {
        console.error("Error getting landing config from server action:", error);
        return null;
    }
}
