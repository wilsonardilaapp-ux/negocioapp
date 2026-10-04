'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import { FieldValue } from 'firebase-admin/firestore';

interface UpdateMetricsInput {
  businessId: string;
  ruleId: string;
  event: 'shown' | 'accepted' | 'rejected';
  revenue?: number;
}

export async function updateSuggestionMetrics(input: UpdateMetricsInput) {
  const { businessId, ruleId, event, revenue = 0 } = input;
  
  if (ruleId === 'ai-generated' || !ruleId) {
    return { success: true };
  }

  try {
    if (!businessId || !ruleId) {
      return { success: false, error: 'Missing businessId or ruleId' };
    }

    const firestore = await getAdminFirestore();
    const ruleRef = firestore.doc(`businesses/${businessId}/suggestionRules/${ruleId}`);

    const ruleSnap = await ruleRef.get();
    if (!ruleSnap.exists) {
      return { success: false, error: 'Rule not found' };
    }

    const timestamp = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      'metrics.lastUpdated': timestamp,
    };

    if (event === 'shown') {
      updatePayload['metrics.timesShown'] = FieldValue.increment(1);
    } else if (event === 'accepted') {
      updatePayload['metrics.timesAccepted'] = FieldValue.increment(1);
      if (revenue > 0) {
        updatePayload['metrics.revenueGenerated'] = FieldValue.increment(revenue);
      }
    }

    await ruleRef.update(updatePayload);
    console.log(`[METRICS] ✅ Evento '${event}' registrado correctamente para la regla ${ruleId}`);
    return { success: true };

  } catch (error: any) {
    console.error(`[METRICS] ❌ Error al registrar métricas:`, error.message);
    return { success: false, error: error.message };
  }
}
