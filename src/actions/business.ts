'use server';

import { getAdminFirestore } from '../firebase/server-init';
import { revalidatePath } from 'next/cache';

/**
 * Actualiza la configuración de fidelización del negocio.
 * Específicamente el enlace de Google Reviews para la recuperación proactiva (Fase 10.1).
 */
export async function updateBusinessLoyaltyConfig(businessId: string, data: { googleReviewLink: string }) {
  if (!businessId) {
    return { success: false, error: 'ID de negocio no proporcionado.' };
  }

  try {
    const db = await getAdminFirestore();
    const businessRef = db.collection('businesses').doc(businessId);

    // Actualización quirúrgica del campo googleReviewLink
    await businessRef.update({
      googleReviewLink: data.googleReviewLink || '',
      updatedAt: new Date().toISOString()
    });

    // Invalida la caché de las páginas que consumen esta configuración
    revalidatePath('/dashboard/loyalty');
    
    return { success: true };
  } catch (error: any) {
    console.error('[Action: updateBusinessLoyaltyConfig] Error:', error.message);
    return { success: false, error: 'No se pudo actualizar la configuración del negocio.' };
  }
}
