'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableNetwork } from 'firebase/firestore'; // Import enableNetwork

let networkEnabled = false; // Flag to prevent multiple calls

export function initializeFirebase() {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const sdks = getSdks(app);

  // The Firestore client can sometimes default to offline in certain environments.
  // This explicitly enables network access to prevent "client is offline" errors.
  // The flag ensures this is only attempted once.
  if (!networkEnabled) {
    try {
      enableNetwork(sdks.firestore);
      networkEnabled = true;
    } catch (error) {
      console.warn('Could not enable Firestore network:', error);
    }
  }

  return sdks;
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
export * from './subscription';
