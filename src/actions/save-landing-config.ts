'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import type { LandingPageData } from '@/models/landing-page';

export async function saveLandingConfig(data: LandingPageData): Promise<{ success: boolean; error?: string }> {
  try {
    const firestore = await getAdminFirestore();
    const docRef = firestore.collection('landing_configs').doc('main');
    
    // Cleaning the data to remove any `undefined` values that Firestore Admin SDK cannot serialize.
    const cleanData = JSON.parse(JSON.stringify(data));

    await docRef.set(cleanData, { merge: true });
    
    return { success: true };
  } catch (error: any) {
    console.error("Error saving landing config via server action:", error);
    return { success: false, error: error.message };
  }
}
