
'use server';

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

function formatPrivateKey(key: string): string {
  return key.replace(/\\n/g, '\n');
}

/**
 * Gets the singleton instance of the Firestore admin database.
 * This function also handles the initialization of the Firebase Admin SDK.
 * @returns {Promise<FirebaseFirestore.Firestore>} The Firestore admin instance.
 */
export async function getAdminFirestore() {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      console.error("FIREBASE_PROJECT_ID:", projectId ? "Loaded" : "MISSING");
      console.error("FIREBASE_CLIENT_EMAIL:", clientEmail ? "Loaded" : "MISSING");
      console.error("FIREBASE_PRIVATE_KEY:", privateKey ? "Loaded" : "MISSING");
      throw new Error('Missing Firebase Admin SDK credentials in environment variables.');
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: formatPrivateKey(privateKey),
        }),
      });
      console.log("Firebase Admin SDK initialized successfully.");
    } catch (error) {
      console.error("Error initializing Firebase Admin SDK:", error);
      throw error;
    }
  }
  
  return getFirestore();
}
