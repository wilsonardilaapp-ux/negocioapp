'use server';

import { getAdminFirestore } from "@/firebase/server-init";
import { SHARE_CARDS_MODULE } from "@/constants/share-cards";

/**
 * Verifica en el servidor si un negocio tiene el módulo activo y extrae su límite real
 * configurado por el SuperAdmin en Planes Híbridos o en módulos manuales.
 */
export async function checkShareCardsModuleActive(businessId: string): Promise<{ active: boolean; limit: number }> {
  if (!businessId) return { active: false, limit: 0 };
  try {
    const firestore = await getAdminFirestore();
    
    // 1. Verificar módulo manual en el negocio
    const modDoc = await firestore.doc(`businesses/${businessId}/modules/${SHARE_CARDS_MODULE.KEY}`).get();
    let isManualActive = false;
    if (modDoc.exists) {
      const data = modDoc.data();
      isManualActive = data?.active === true;
    }

    // 2. Verificar límites extra del negocio
    const busDoc = await firestore.doc(`businesses/${businessId}`).get();
    const busData = busDoc.data() || {};
    const extraLimit = Number(busData?.limitesExtra?.[SHARE_CARDS_MODULE.KEY] || 0);

    // 3. Verificar si el plan asignado lo incluye y obtener el límite de extraLimits
    let isPlanActive = false;
    let planConfiguredLimit: number | null = null;

    if (busData.planName) {
      const hybridPlansSnap = await firestore.collection("hybrid_plans").where("name", "==", busData.planName).limit(1).get();
      if (!hybridPlansSnap.empty) {
        const planData = hybridPlansSnap.docs[0].data();
        if (Array.isArray(planData?.includedModuleKeys) && planData.includedModuleKeys.includes(SHARE_CARDS_MODULE.KEY)) {
          isPlanActive = true;
        }

        // Buscar en extraLimits el límite asignado a Tarjetas de seguimiento
        if (Array.isArray(planData?.extraLimits)) {
          const limitItem = planData.extraLimits.find((item: any) => {
            const k = (item.key || '').toLowerCase().trim();
            return k === SHARE_CARDS_MODULE.KEY || 
                   k === 'tarjetas de seguimiento' || 
                   k.includes('tarjeta') || 
                   k.includes('seguimiento');
          });
          if (limitItem && limitItem.value !== undefined && limitItem.value !== null) {
            planConfiguredLimit = Number(limitItem.value);
          }
        }
      }
    }

    const isActive = isManualActive || isPlanActive;
    
    // El límite base es el del Plan Híbrido si está configurado, o el por defecto del módulo
    const baseLimit = planConfiguredLimit !== null ? planConfiguredLimit : SHARE_CARDS_MODULE.DEFAULT_LIMIT;
    const effectiveLimit = Math.max(0, baseLimit + extraLimit);

    return { active: isActive, limit: effectiveLimit };
  } catch (error) {
    console.error("Error verificando módulo share-cards:", error);
    return { active: false, limit: 0 };
  }
}
