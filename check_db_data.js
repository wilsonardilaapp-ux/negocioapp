import * as dotenv from 'dotenv';
dotenv.config();

import { getAdminFirestore } from './src/firebase/server-init';

async function check() {
  const db = await getAdminFirestore();

  console.log('--- 1. DATOS DEL RESTAURANTE (5vbHBuJHb9Uklh2OoOl8kin7iZA2) ---');
  const bDoc = await db.collection('businesses').doc('5vbHBuJHb9Uklh2OoOl8kin7iZA2').get();
  if (bDoc.exists) {
    const data = bDoc.data() || {};
    console.log({
      id: bDoc.id,
      name: data.name,
      planName: data.planName,
      planType: data.planType,
      planSlug: data.planSlug,
      planId: data.planId,
    });
  } else {
    console.log('Negocio no encontrado por ese ID exacto.');
  }

  console.log('\n--- 2. PLANES HÍBRIDOS EN FIRESTORE (hybrid_plans) ---');
  const hSnap = await db.collection('hybrid_plans').get();
  hSnap.forEach(doc => {
    const d = doc.data();
    console.log({
      id: doc.id,
      name: d.name,
      slug: d.slug,
      pricePerOrder: d.pricePerOrder,
      commissionType: d.commissionType,
      tableCommissionRate: d.tableCommissionRate
    });
  });
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
