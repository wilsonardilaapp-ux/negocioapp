// src/utils/validateModuleExtra.ts

/**
 * Valida los límites extra de un plan comparándolos con el plan inmediato superior.
 * Esta versión es dinámica y no depende de valores hardcodeados, sino de los datos de Firestore.
 */
export function validateLimitesExtra(
  planActual: string,
  limitesBase: Record<string, number>,
  limitesSiguientePlan: Record<string, number> | null,
  extras: Record<string, number>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  let isValid = true;

  // Si no hay plan siguiente (ej: ENTERPRISE), todos los extras son válidos técnicamente
  if (!limitesSiguientePlan) {
    return { valid: true, errors: {} };
  }

  // Iterar sobre los campos definidos en los extras
  Object.keys(extras).forEach((key) => {
    const base = limitesBase[key] || 0;
    const extra = extras[key] || 0;
    const total = base + extra;
    const techo = limitesSiguientePlan[key];

    // La regla: Total < Límite del plan superior
    // Si el techo es -1 (ilimitado), no hay restricción de subida
    if (techo !== undefined && techo !== -1) {
      if (total >= techo) {
        isValid = false;
        errors[key] = `El total (${total}) no puede igualar ni superar el límite de ${planActual} superior (${techo})`;
      }
    }
  });

  return { valid: isValid, errors };
}

/**
 * Mantiene compatibilidad con la validación de módulos individuales si es necesario,
 * pero ahora utiliza una lógica más flexible.
 */
export function validateModuleExtra(
  planActualName: string | undefined,
  extra: number
): { valid: boolean; error: string; baseLimit: number; totalLimit: number } {
  // Esta función se mantiene por compatibilidad con la sección de Módulos Asignados existente
  // pero idealmente debería migrar a usar los datos de planes reales de Firestore.
  const baseLimits: Record<string, number> = {
    'FREE': 4,
    'BASIC': 200,
    'PRO': 1000,
    'ENTERPRISE': 5000,
  };

  const tierOrder = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'];
  const currentTier = (planActualName || 'FREE').toUpperCase().includes('PRO') ? 'PRO' : 
                     (planActualName || 'FREE').toUpperCase().includes('BASIC') ? 'BASIC' :
                     (planActualName || 'FREE').toUpperCase().includes('ENTERPRISE') ? 'ENTERPRISE' : 'FREE';

  const baseLimit = baseLimits[currentTier] || 0;
  const totalLimit = baseLimit + extra;
  const currentIndex = tierOrder.indexOf(currentTier);
  const nextTier = tierOrder[currentIndex + 1];

  if (nextTier) {
    const nextLimit = baseLimits[nextTier];
    if (totalLimit >= nextLimit) {
      return {
        valid: false,
        error: `El total (${totalLimit}) no puede igualar ni superar el límite de ${nextTier} (${nextLimit})`,
        baseLimit,
        totalLimit,
      };
    }
  }

  return { valid: true, error: '', baseLimit, totalLimit };
}
