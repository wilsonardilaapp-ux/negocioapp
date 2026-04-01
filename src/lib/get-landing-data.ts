'use server';

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";
import { unstable_noStore as noStore } from 'next/cache';

// This function runs on the server, but uses the client SDK for simplicity
// and robustness, avoiding the need for Admin SDK credentials for public data.
const getClientDb = () => {
    // Ensure Firebase is initialized, but only once.
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    return getFirestore(app);
}

export async function getLandingData() {
  // Disable caching for this function to ensure data is always fresh.
  noStore(); 
  
  try {
    // Check for a valid projectId, crucial for server-side client SDK operations.
    if (!firebaseConfig.projectId) {
        console.error("CRITICAL: Firebase projectId is not configured in src/firebase/config.ts. Server-side fetching will fail.");
        return null;
    }

    const db = getClientDb();
    const docRef = doc(db, 'landing_configs', 'main');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      console.warn("Document 'landing_configs/main' not found in the database.");
      return null;
    }
    return docSnap.data();
  } catch (error) {
    console.error("Error in getLandingData while fetching from 'landing_configs/main':", error);
    return null;
  }
}
