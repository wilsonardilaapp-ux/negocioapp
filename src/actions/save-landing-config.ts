'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import { revalidatePath } from 'next/cache';
import type { LandingPageData } from '@/models/landing-page';

export async function saveLandingConfig(newData: LandingPageData): Promise<{ success: boolean; error?: string }> {
  try {
    const firestore = await getAdminFirestore();

    // 1. Limpiar datos antes de guardar (evitar undefined) y añadir timestamp
    const cleanData = JSON.parse(JSON.stringify(newData));
    const dataToSave = {
      ...cleanData,
      updatedAt: new Date().getTime(),
    };

    // 2. Guardar en la ruta correcta
    await firestore.collection('landing_configs').doc('main').set(dataToSave);

    // 3. PURGA TOTAL DE CACHÉ
    revalidatePath('/', 'layout'); // Purga la home y sus layouts
    revalidatePath('/superadmin/landing-public', 'page'); // Purga el editor
    
    return { success: true };
  } catch (error: any) {
    console.error("Error Grave al Guardar:", error);
    return { success: false, error: error.message };
  }
}
