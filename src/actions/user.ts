
'use server';

import { getAdminFirestore } from "@/firebase/server-init";

/**
 * Checks if there are any users in the 'users' collection.
 * This is used to determine if the user being registered is the first one,
 * in order to grant them super_admin privileges.
 * @returns {Promise<boolean>} True if no users exist, false otherwise.
 */
export async function isFirstUser(): Promise<boolean> {
  try {
    const firestore = await getAdminFirestore();
    const usersCollection = firestore.collection('users');
    const snapshot = await usersCollection.limit(1).get();
    
    // If the snapshot is empty, it means there are no documents in the collection.
    return snapshot.empty;
  } catch (error) {
    console.error("Error checking for first user:", error);
    // As a security measure, if we can't check, we assume it's not the first user.
    return false;
  }
}
