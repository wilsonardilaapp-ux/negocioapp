import * as dotenv from 'dotenv';
dotenv.config();

import { getAdminFirestore } from '../src/firebase/server-init';

async function seed() {
  console.log('🌱 Actualizando planes híbridos con tableCommissionRate: 3%...');
  const db = await getAdminFirestore();
  const snap = await db.collection('hybrid_plans').get();
  
  let updatedCount = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.tableCommissionRate === undefined || data.tableCommissionRate === null) {
      await doc.ref.update({
        tableCommissionRate: 3,
        tableCommissionType: 'percent'
      });
      console.log(`  ✅ Plan '${data.name || doc.id}' actualizado con 3% en mesa.`);
      updatedCount++;
    } else {
      console.log(`  ℹ️ Plan '${data.name || doc.id}' ya tiene configurado: ${data.tableCommissionRate}% en mesa.`);
    }
  }

  console.log(`\n🎉 Total planes actualizados: ${updatedCount} de ${snap.size}`);
}

seed()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error al actualizar planes:', err);
    process.exit(1);
  });
