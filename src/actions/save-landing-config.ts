'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import type { LandingPageData } from '@/models/landing-page';
import { revalidatePath } from 'next/cache';
import { unstable_noStore as noStore } from 'next/cache';

/**
 * Guarda la configuración completa de la landing page en Firestore.
 * @param {LandingPageData} data - El objeto completo de configuración de la página.
 * @returns {Promise<{ success: boolean; error?: string }>} Resultado de la operación.
 */
export async function saveLandingConfig(data: LandingPageData): Promise<{ success: boolean; error?: string }> {
  try {
    const firestore = await getAdminFirestore();
    const docRef = firestore.collection('landing_configs').doc('main');
    
    // Limpia los datos para evitar errores con valores `undefined`
    const cleanData = JSON.parse(JSON.stringify(data));

    await docRef.set({
      ...cleanData,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
    
    // Purga agresivamente la caché
    revalidatePath('/', 'layout');
    revalidatePath('/superadmin/landing-public');
    
    return { success: true };
  } catch (error: any) {
    console.error("Error al guardar:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene los datos de la landing page desde Firestore usando el Admin SDK.
 * @returns {Promise<LandingPageData | null>} Los datos de la landing page o null si hay un error.
 */
export async function getLandingConfig(): Promise<LandingPageData | null> {
    noStore();
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
