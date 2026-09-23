import * as dotenv from 'dotenv';
dotenv.config();

import { getAdminFirestore } from '../src/firebase/server-init';

async function syncAll() {
  const db = await getAdminFirestore();
  const businessId = '5vbHBuJHb9Uklh2OoOl8kin7iZA2';

  console.log('🔄 Sincronizando productos para el negocio:', businessId);
  const productsSnap = await db.collection('businesses').doc(businessId).collection('products').get();
  const products = productsSnap.docs.map((d: any) => ({ ...d.data(), id: d.id }));

  console.log(`📦 Encontrados ${products.length} productos en la subcolección real.`);

  const publicCatalogRef = db.collection('businesses').doc(businessId).collection('publicData').doc('catalog');
  await publicCatalogRef.set({
    products: products,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  console.log(`✅ ${products.length} productos sincronizados exitosamente en publicData/catalog.`);
}

syncAll().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
