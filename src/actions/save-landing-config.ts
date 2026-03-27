
'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import type { LandingPageData } from '@/models/landing-page';

export async function saveLandingConfig(data: LandingPageData): Promise<{ success: boolean; error?: string }> {
  try {
    const firestore = await getAdminFirestore();
    const docRef = firestore.collection('landing_configs').doc('main');
    
    // Cleaning the data to remove any `undefined` values that Firestore Admin SDK cannot serialize.
    // This is a robust way to ensure the data is clean before sending.
    const cleanData = JSON.parse(JSON.stringify(data));

    // Using set without merge performs a complete overwrite of the document.
    // This ensures no old or partial data (like 'initialized: true') remains.
    await docRef.set(cleanData);
    
    return { success: true };
  } catch (error: any) {
    console.error("Error saving landing config via server action:", error);
    return { success: false, error: error.message };
  }
}
