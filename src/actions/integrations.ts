
'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import { revalidatePath } from 'next/cache';
import type { Integration } from '@/models/integration';

const slugify = (text: string) =>
  text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

export async function createIntegration(
  data: {
    name: string;
    description?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const firestore = await getAdminFirestore();
    const integrationId = slugify(data.name);
    const docRef = firestore.collection('integrations').doc(integrationId);
    
    const integrationData: Integration = {
      id: integrationId,
      name: data.name,
      fields: '{}', 
      status: 'inactive',
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(integrationData);
    
    revalidatePath('/superadmin/integraciones');
    
    return { success: true };
  } catch (error: any) {
    console.error("Error creating integration:", error);
    return { success: false, error: error.message };
  }
}

export async function saveIntegrationFields(integrationId: string, fields: string): Promise<{ success: boolean; error?: string }> {
    try {
        const firestore = await getAdminFirestore();
        const docRef = firestore.collection('integrations').doc(integrationId);

        await docRef.update({ 
            fields: fields,
            updatedAt: new Date().toISOString()
        });
        
        revalidatePath('/superadmin/integraciones');
        
        return { success: true };
    } catch (error: any) {
        console.error("Error saving integration fields:", error);
        return { success: false, error: error.message || 'An unknown server error occurred.' };
    }
}

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
        console.error("Error updating integration status:", error);
        return { success: false, error: error.message || 'An unknown server error occurred.' };
    }
}

export async function deleteIntegration(integrationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const firestore = await getAdminFirestore();
    const docRef = firestore.collection('integrations').doc(integrationId);
    
    await docRef.delete();
    
    revalidatePath('/superadmin/integraciones');
    
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting integration:", error);
    return { success: false, error: error.message || 'An unknown server error occurred.' };
  }
}
