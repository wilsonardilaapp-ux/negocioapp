'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import { unstable_noStore as noStore } from 'next/cache';

export async function getLandingData() {
  // 1. Nuclear option: le dice a Next.js que ignore CUALQUIER caché para esta función
  noStore(); 
  
  try {
    const dbAdmin = await getAdminFirestore();
    // RUTA EXACTA: landing_configs/main
    const docRef = dbAdmin.collection('landing_configs').doc('main');
    const doc = await docRef.get();
    if (!doc.exists) return null;
    return doc.data();
  } catch (error) {
    console.error("Error crítico en fetch:", error);
    return null;
  }
}
