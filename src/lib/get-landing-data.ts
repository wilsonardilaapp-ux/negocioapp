'use server';

import { getAdminFirestore } from "@/firebase/server-init";
import { unstable_noStore as noStore } from 'next/cache';
import type { LandingPageData } from "@/models/landing-page";

/**
 * Obtiene los datos de la landing page principal desde 'landing_configs/main'.
 * Esta función está diseñada para ser llamada desde Componentes de Servidor (RSC).
 * Incluye `noStore()` para prevenir el caché y asegurar datos frescos.
 */
export async function getLandingData(): Promise<LandingPageData | null> {
  // Deshabilita el cache para esta función, garantizando datos frescos en cada petición.
  noStore(); 
  
  try {
    const db = await getAdminFirestore();
    const docRef = db.collection('landing_configs').doc('main');
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.warn("Documento 'landing_configs/main' no encontrado en la base de datos.");
      return null;
    }
    
    const data = docSnap.data();

    if (!data) {
        return null;
    }
    
    // Devolvemos los datos junto con el timestamp de la última actualización
    return {
        ...data,
        updatedAt: data.updatedAt || null, 
    } as LandingPageData;

  } catch (error) {
    console.error("Error en getLandingData al obtener 'landing_configs/main':", error);
    return null;
  }
}
