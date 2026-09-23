const fs = require('fs');
const path = require('path');

function backupAndEdit(filePath, modifier) {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`❌ Archivo no encontrado: ${filePath}`);
    return;
  }
  const original = fs.readFileSync(absPath, 'utf8');
  const bakPath = `${absPath}.bak`;
  if (!fs.existsSync(bakPath)) {
    fs.writeFileSync(bakPath, original, 'utf8');
    console.log(`🛡️ Respaldo creado: ${filePath}.bak`);
  }
  const modified = modifier(original);
  if (modified !== original) {
    fs.writeFileSync(absPath, modified, 'utf8');
    console.log(`✅ Modificado exitosamente (aditivo): ${filePath}`);
  } else {
    console.log(`ℹ️ Sin cambios requeridos: ${filePath}`);
  }
}

backupAndEdit('src/app/(auth)/register/page.tsx', (content) => {
  if (content.includes('resolvedPlanType')) return content;

  let updated = content;

  // 1. Detectar tipo de plan al consultar Firestore
  const oldPlanFetch = `let planDetails: SubscriptionPlan | HybridPlan | null = null;

      if (planParam) {
          const standardPlanSnap = await getDoc(doc(firestore, 'plans', planParam));
          if (standardPlanSnap.exists()) {
              planDetails = { ...standardPlanSnap.data(), id: standardPlanSnap.id } as SubscriptionPlan;
          } else {
              const hybridPlanSnap = await getDoc(doc(firestore, 'hybrid_plans', planParam));
              if (hybridPlanSnap.exists()) {
                  planDetails = { ...hybridPlanSnap.data(), id: hybridPlanSnap.id } as HybridPlan;
              }
          }
      }`;

  const newPlanFetch = `let planDetails: SubscriptionPlan | HybridPlan | null = null;
      let resolvedPlanType: 'fijo' | 'hibrido' = 'hibrido';

      if (planParam) {
          const standardPlanSnap = await getDoc(doc(firestore, 'plans', planParam));
          if (standardPlanSnap.exists()) {
              planDetails = { ...standardPlanSnap.data(), id: standardPlanSnap.id } as SubscriptionPlan;
              resolvedPlanType = 'fijo';
          } else {
              const hybridPlanSnap = await getDoc(doc(firestore, 'hybrid_plans', planParam));
              if (hybridPlanSnap.exists()) {
                  planDetails = { ...hybridPlanSnap.data(), id: hybridPlanSnap.id } as HybridPlan;
                  resolvedPlanType = 'hibrido';
              }
          }
      }`;

  updated = updated.replace(oldPlanFetch, newPlanFetch);

  // 2. Inyectar planType en businessData
  const oldBusinessData = `planName: planDetails?.name || 'Plan Crecimiento',`;
  const newBusinessData = `planName: planDetails?.name || 'Plan Crecimiento',
        planType: resolvedPlanType,`;

  updated = updated.replace(oldBusinessData, newBusinessData);

  return updated;
});

console.log('\n🎉 Fase 6 aplicada.');
