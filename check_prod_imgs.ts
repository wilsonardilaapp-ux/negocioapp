import * as dotenv from 'dotenv';
dotenv.config();

import { getAdminFirestore } from './src/firebase/server-init';

async function run() {
  const db = await getAdminFirestore();
  const snap = await db.collection("businesses").doc("5vbHBuJHb9Uklh2OoOl8kin7iZA2").collection("products").get();
  snap.forEach(d => {
    const data = d.data();
    if (data.name.includes("Masaje") || data.name.includes("Esmalte")) {
      console.log({
        name: data.name,
        images: data.images,
        image: (data as any).image,
        imageUrl: (data as any).imageUrl
      });
    }
  });
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
