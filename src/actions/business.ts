'use server';

import { getAdminFirestore } from '../firebase/server-init';
import { revalidatePath } from 'next/cache';

/**
 * Actualiza la configuración de fidelización del negocio.
 * Soporta actualización de link de Google y umbral de abandono (Churn).
 */
export async function updateBusinessLoyaltyConfig(
  businessId: string, 
  data: { googleReviewLink?: string; churnDaysThreshold?: number }
) {
  if (!businessId) {
    return { success: false, error: 'ID de negocio no proporcionado.' };
  }

  try {
    const db = await getAdminFirestore();
    const businessRef = db.collection('businesses').doc(businessId);

    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    // Actualización quirúrgica del campo googleReviewLink
    if (data.googleReviewLink !== undefined) {
      updates.googleReviewLink = data.googleReviewLink || '';
    }

    // Actualización quirúrgica del umbral de abandono dentro de loyaltyConfig
    if (data.churnDaysThreshold !== undefined) {
      // Validación: entre 1 y 365 días
      const threshold = Math.max(1, Math.min(365, Math.floor(data.churnDaysThreshold)));
      updates['loyaltyConfig.churnDaysThreshold'] = threshold;
    }

    await businessRef.update(updates);

    // Invalida la caché de las páginas que consumen esta configuración
    revalidatePath('/dashboard/loyalty');
    
    return { success: true };
  } catch (error: any) {
    console.error('[Action: updateBusinessLoyaltyConfig] Error:', error.message);
    return { success: false, error: 'No se pudo actualizar la configuración del negocio.' };
  }
}
