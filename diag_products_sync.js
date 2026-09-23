import * as dotenv from 'dotenv';
dotenv.config();

import { getAdminFirestore } from './src/firebase/server-init';
import fs from 'fs';

async function check() {
  const db = await getAdminFirestore();
  const businessId = '5vbHBuJHb9Uklh2OoOl8kin7iZA2';

  console.log('--- 1. PRODUCTOS REALES EN businesses/{id}/products ---');
  const productsSnap = await db.collection('businesses').doc(businessId).collection('products').get();
  console.log(`Total productos en la subcolección real: ${productsSnap.size}`);

  console.log('\n--- 2. PRODUCTOS EN publicData/catalog ---');
  const pubDoc = await db.collection('businesses').doc(businessId).collection('publicData').doc('catalog').get();
  if (pubDoc.exists) {
    const data = pubDoc.data() || {};
    const prods = data.products || [];
    console.log(`Total productos en publicData/catalog: ${prods.length}`);
    console.log(`Última actualización de publicData/catalog: ${data.updatedAt || 'N/A'}`);
  } else {
    console.log('No existe el documento publicData/catalog');
  }

  console.log('\n--- 3. ARCHIVOS QUE ESCRIBEN EN publicData/catalog ---');
  function findSyncFiles(dir) {
    let res = [];
    for (const f of fs.readdirSync(dir)) {
      const full = `${dir}/${f}`;
      if (['node_modules', '.git', '.next'].includes(f)) continue;
      if (fs.statSync(full).isDirectory()) res = res.concat(findSyncFiles(full));
      else if (/\.(tsx?|jsx?)$/.test(f)) {
        const c = fs.readFileSync(full, 'utf8');
        if (c.includes('publicData') && c.includes('catalog')) {
          res.push(full);
        }
      }
    }
    return res;
  }
  console.log(findSyncFiles('src'));
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
