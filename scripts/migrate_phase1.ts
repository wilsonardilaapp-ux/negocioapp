import * as dotenv from 'dotenv';
dotenv.config();

import { getAdminFirestore } from '../src/firebase/server-init';

async function run() {
  console.log('🚀 Iniciando migración de Fase 1 (No destructiva)...');
  const db = await getAdminFirestore();

  // 1. Obtener nombres/IDs de planes híbridos existentes
  const hybridSnap = await db.collection('hybrid_plans').get();
  const hybridNames = new Set<string>();
  hybridSnap.forEach(doc => {
    hybridNames.add(doc.id.toLowerCase());
    const data = doc.data();
    if (data.name) hybridNames.add(String(data.name).toLowerCase());
    if (data.slug) hybridNames.add(String(data.slug).toLowerCase());
  });
  console.log(`📦 Planes híbridos detectados en Firestore: ${Array.from(hybridNames).join(', ')}`);

  // 2. Migrar Restaurantes (businesses)
  const businessesSnap = await db.collection('businesses').get();
  let businessesUpdated = 0;
  let productsUpdated = 0;

  for (const bDoc of businessesSnap.docs) {
    const bData = bDoc.data();
    const currentPlanName = String(bData.planName || '').toLowerCase();
    
    // Determinar planType según coincidencia con hybrid_plans
    const isHybrid = hybridNames.has(currentPlanName) || 
                     currentPlanName.includes('crecimiento') || 
                     currentPlanName.includes('estandar') || 
                     currentPlanName.includes('profesional') ||
                     currentPlanName.includes('basico') ||
                     currentPlanName.includes('arranque');
    
    const assignedPlanType = isHybrid ? 'hibrido' : 'fijo';

    if (!bData.planType || bData.planType !== assignedPlanType) {
      await bDoc.ref.update({ planType: assignedPlanType });
      businessesUpdated++;
      console.log(`  🏬 Negocio '${bData.name || bDoc.id}' -> planType: '${assignedPlanType}' (planName: ${bData.planName || 'N/A'})`);
    }

    // 3. Migrar Platos de este negocio (subcolección products)
    const productsSnap = await bDoc.ref.collection('products').get();
    for (const pDoc of productsSnap.docs) {
      const pData = pDoc.data();
      // Si basePrice no está definido o no existe, copiamos price -> basePrice manteniendo price intacto
      if (pData.basePrice === undefined || pData.basePrice === null) {
        const fallbackPrice = typeof pData.price === 'number' ? pData.price : 0;
        await pDoc.ref.update({ basePrice: fallbackPrice });
        productsUpdated++;
      }
    }
  }

  console.log('\n================ RESUMEN DE MIGRACIÓN ================');
  console.log(`✅ Negocios procesados: ${businessesSnap.size}`);
  console.log(`✅ Negocios con planType asignado/actualizado: ${businessesUpdated}`);
  console.log(`✅ Platos/Productos con basePrice inicializado: ${productsUpdated}`);
  console.log('=======================================================\n');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error en migración:', err);
    process.exit(1);
  });
