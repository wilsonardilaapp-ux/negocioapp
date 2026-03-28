'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import { revalidatePath } from 'next/cache';

export async function updateIntegrationStatus(integrationId: string, status: 'active' | 'inactive'): Promise<{ success: boolean; error?: string }> {
    try {
        const firestore = await getAdminFirestore();
        const docRef = firestore.collection('integrations').doc(integrationId);
        
        await docRef.update({ 
            status: status,
            updatedAt: new Date().toISOString()
        });
        
        revalidatePath('/superadmin/integraciones');
        
        return { success: true };
    } catch (error: any) {
        console.error("Error updating integration status from server action:", error);
        return { success: false, error: error.message || 'An unknown server error occurred.' };
    }
}
