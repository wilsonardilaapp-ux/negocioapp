'use server';

import { revalidatePath } from 'next/cache';
// Data and Admin SDK are no longer needed here, as the write happens on the client.

export async function saveBusinessLanding(businessId: string): Promise<{ success: boolean; error?: string }> {
  if (!businessId) {
    return { success: false, error: "Business ID no proporcionado." };
  }

  try {
    // This server action is now only responsible for cache invalidation.
    // The data write operation is handled on the client-side to respect security rules.
    revalidatePath(`/landing/${businessId}`, 'page');
    
    return { success: true };
  } catch (error: any) {
    console.error("Error revalidando landing de negocio:", error);
    return { success: false, error: `Error al actualizar la caché de la página: ${error.message}` };
  }
}
