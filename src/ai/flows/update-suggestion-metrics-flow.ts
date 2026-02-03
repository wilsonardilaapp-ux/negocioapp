
'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import { FieldValue } from 'firebase-admin/firestore';

interface UpdateMetricsInput {
  businessId: string;
  ruleId: string;
  event: 'shown' | 'accepted' | 'rejected';
  revenue?: number; // Este campo ya no se usará aquí, pero lo mantenemos por compatibilidad
}

export async function updateSuggestionMetrics(input: UpdateMetricsInput) {
  const { businessId, ruleId, event } = input;
  
  if (ruleId === 'ai-generated') {
    console.log(`[METRICS] 📊 Evento '${event}' para sugerencia de IA. No se actualiza regla.`);
    return { success: true };
  }

  console.log(`[METRICS] 🛠️ Procesando evento: ${event} | Regla: ${ruleId}`);

  // Con la nueva sincronización, solo nos interesa contar las veces que se muestra.
  // Las conversiones y el revenue se calcularán desde los pedidos reales.
  if (event !== 'shown') {
    console.log(`[METRICS] ⏩ Evento '${event}' será calculado por la sincronización. Omitiendo actualización en tiempo real.`);
    return { success: true, message: "Accepted event will be tracked by sync." };
  }

  try {
    if (!businessId || !ruleId) {
      console.error('[METRICS] ❌ Faltan IDs (businessId o ruleId)');
      return { success: false, error: 'Missing businessId or ruleId' };
    }

    const firestore = await getAdminFirestore();
    const ruleRef = firestore.doc(`businesses/${businessId}/suggestionRules/${ruleId}`);

    const ruleSnap = await ruleRef.get();
    if (!ruleSnap.exists) {
      console.error(`[METRICS] ❌ Regla no encontrada: ${ruleId}`);
      return { success: false, error: 'Rule not found' };
    }

    const timestamp = new Date().toISOString();
    
    // Solo actualizamos las vistas (timesShown) usando la sintaxis de Admin SDK
    const updates = {
      'metrics.timesShown': FieldValue.increment(1),
      'metrics.lastUpdated': timestamp,
    };

    // Usamos set con merge:true que es equivalente a update pero crea el doc si no existe
    await ruleRef.set({ metrics: updates }, { merge: true });
    
    console.log(`[METRICS] ✅ Vista registrada exitosamente para la regla ${ruleId}.`);
    return { success: true };

  } catch (error) {
    console.error(`[METRICS] ❌ Error crítico al registrar vista:`, error);
    return { success: false, error: (error as Error).message };
  }
}
