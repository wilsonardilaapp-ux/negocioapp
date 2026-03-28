'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import { revalidatePath } from 'next/cache';

export async function saveIntegration(integrationId: string, data: any): Promise<{ success: boolean; error?: string }> {
    try {
        const firestore = await getAdminFirestore();
        const docRef = firestore.collection('integrations').doc(integrationId);
        
        // Ensure data is clean before saving
        const cleanData = { ...data };
        delete cleanData.id; // Firestore handles the ID in the path

        await docRef.set(cleanData, { merge: true });
        
        revalidatePath('/superadmin/integraciones');
        
        return { success: true };
    } catch (error: any) {
        console.error("Error saving integration from server action:", error);
        return { success: false, error: error.message || 'An unknown server error occurred.' };
    }
}
