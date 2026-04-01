'use server';

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";
import { unstable_noStore as noStore } from 'next/cache';
import type { LandingPageData } from "@/models/landing-page";

// Esta función se ejecuta en el servidor, pero usa el SDK de cliente para ser más robusta
// y no depender de credenciales de entorno que pueden fallar.
const getClientDb = () => {
    // Aseguramos que Firebase se inicialice, pero solo una vez.
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    return getFirestore(app);
}

/**
 * Obtiene los datos de la landing page principal desde 'landing_configs/main'.
 * Esta función está diseñada para ser llamada desde Componentes de Servidor (RSC).
 * Incluye `noStore()` para prevenir el caché y asegurar datos frescos.
 */
export async function getLandingData(): Promise<LandingPageData | null> {
  // Deshabilita el cache para esta función, garantizando datos frescos en cada petición.
  noStore(); 
  
  try {
    // Es crítico verificar el projectId para que el SDK funcione en el servidor.
    if (!firebaseConfig.projectId) {
        console.error("CRÍTICO: El projectId de Firebase no está configurado en src/firebase/config.ts. La obtención de datos en el servidor fallará.");
        return null;
    }

    const db = getClientDb();
    const docRef = doc(db, 'landing_configs', 'main');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.warn("Documento 'landing_configs/main' no encontrado en la base de datos.");
      return null;
    }
    
    // Devolvemos los datos junto con el timestamp de la última actualización
    const data = docSnap.data();
    return {
        ...data,
        updatedAt: data.updatedAt || null, 
    } as LandingPageData;

  } catch (error) {
    console.error("Error en getLandingData al obtener 'landing_configs/main':", error);
    return null;
  }
}
