
'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import type { LandingPageData } from '@/models/landing-page';
import { revalidatePath, unstable_noStore as noStore } from 'next/cache';

/**
 * Guarda la configuración completa de la landing page en Firestore.
 * @param {LandingPageData} data - El objeto completo de configuración de la página.
 * @returns {Promise<{ success: boolean; error?: string }>} Resultado de la operación.
 */
export async function saveLandingConfig(data: LandingPageData): Promise<{ success: boolean; error?: string }> {
  try {
    const firestore = await getAdminFirestore();
    const docRef = firestore.collection('landing_configs').doc('main');
    
    // Limpia el objeto de datos para eliminar valores `undefined` antes de guardarlo.
    const cleanData = JSON.parse(JSON.stringify(data));

    // Utiliza { merge: true } para una escritura más segura, que actualiza campos
    // existentes en lugar de sobreescribir todo el documento.
    await docRef.set(cleanData, { merge: true });
    
    // Invalida la caché para la página de inicio y el editor.
    revalidatePath('/');
    revalidatePath('/superadmin/landing-public');
    
    return { success: true };
  } catch (error: any) {
    console.error("Error saving landing config via server action:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene los datos de la landing page desde Firestore usando el Admin SDK.
 * @returns {Promise<LandingPageData | null>} Los datos de la landing page o null si hay un error.
 */
export async function getLandingConfig(): Promise<LandingPageData | null> {
    // Desactiva la caché de datos para esta función específica.
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
