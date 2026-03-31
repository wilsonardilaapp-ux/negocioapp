'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import { revalidatePath } from 'next/cache';
import type { LandingPageData } from '@/models/landing-page';

export async function saveBusinessLanding(businessId: string, data: LandingPageData): Promise<{ success: boolean; error?: string }> {
  if (!businessId) {
    return { success: false, error: "Business ID no proporcionado." };
  }

  try {
    const firestore = await getAdminFirestore();
    const docRef = firestore.collection('businesses').doc(businessId).collection('landingPages').doc('main');
    
    // Limpiamos los datos antes de guardarlos para evitar 'undefined'
    const cleanData = JSON.parse(JSON.stringify(data));

    await docRef.set(cleanData, { merge: true });

    // Invalidamos la caché de la página pública específica
    revalidatePath(`/landing/${businessId}`, 'page');
    
    return { success: true };
  } catch (error: any) {
    console.error("Error guardando landing de negocio:", error);
    return { success: false, error: error.message };
  }
}
