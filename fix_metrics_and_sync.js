const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

console.log('=== [PASO 3] APLICANDO FIX DE MÉTRICAS Y ACTUALIZACIÓN EN VIVO ===\n');

// 1. Respaldo y actualización de update-suggestion-metrics-flow.ts
const flowPath = path.join('src', 'ai', 'flows', 'update-suggestion-metrics-flow.ts');
fs.copyFileSync(flowPath, `${flowPath}.bak`);
console.log(`[BACKUP] Creado ${flowPath}.bak`);

const updatedFlowCode = `'use server';

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
    const ruleRef = firestore.doc(\`businesses/\${businessId}/suggestionRules/\${ruleId}\`);

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
    console.log(\`[METRICS] ✅ Evento '\${event}' registrado correctamente para la regla \${ruleId}\`);
    return { success: true };

  } catch (error: any) {
    console.error(\`[METRICS] ❌ Error al registrar métricas:\`, error.message);
    return { success: false, error: error.message };
  }
}
`;

fs.writeFileSync(flowPath, updatedFlowCode, 'utf8');
console.log(`[MODIFICADO] ${flowPath} corregido para registrar 'shown' y 'accepted' correctamente.`);

// 2. Corregir datos existentes en Firestore y disparar sincronización de pedidos
async function fixExistingRulesAndSync() {
  const { getAdminFirestore } = await import('./src/firebase/server-init');
  const { syncMetricsWithOrders } = await import('./src/ai/flows/sync-suggestion-analytics');
  const db = await getAdminFirestore();

  console.log('\n--- SANEANDO REGLAS EXISTENTES EN FIRESTORE ---');
  const businessesSnap = await db.collection('businesses').get();

  for (const bDoc of businessesSnap.docs) {
    const rulesSnap = await db.collection(`businesses/${bDoc.id}/suggestionRules`).get();
    if (rulesSnap.empty) continue;

    for (const rDoc of rulesSnap.docs) {
      const rData = rDoc.data();
      const ghostShown = rData?.metrics?.['metrics.timesShown'] || 0;

      if (ghostShown > 0) {
        console.log(`Migrando regla ${rDoc.id}: ${ghostShown} vistas acumuladas.`);
        await rDoc.ref.update({
          'metrics.timesShown': ghostShown,
          'metrics.metrics.timesShown': FieldValue.delete(),
        });
      }
    }

    // Disparar sincronización con pedidos históricos
    console.log(`\nSincronizando analíticas con pedidos para el negocio ${bDoc.id}...`);
    try {
      const syncResult = await syncMetricsWithOrders(bDoc.id);
      console.log('Resultado de sincronización:', syncResult);
    } catch (e) {
      console.log('Aviso en sincronización:', e.message);
    }
  }
}

fixExistingRulesAndSync().then(() => {
  console.log('\n=== REPARACIÓN Y SINCRONIZACIÓN FINALIZADA ===');
});
