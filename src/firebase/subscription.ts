'use client';

import { doc, getDoc, setDoc, type Firestore } from "firebase/firestore";
import type { Subscription } from "@/models/subscription";

/**
 * Retrieves the subscription document for a given business.
 * @param firestore - The Firestore instance.
 * @param businessId - The ID of the business.
 * @returns A promise that resolves with the subscription data or null if not found.
 */
export async function getSubscription(firestore: Firestore, businessId: string): Promise<Subscription | null> {
    const subDocRef = doc(firestore, 'businesses', businessId, 'subscription', 'current');
    const docSnap = await getDoc(subDocRef);
    return docSnap.exists() ? docSnap.data() as Subscription : null;
}

/**
 * Updates the subscription document for a given business.
 * @param firestore - The Firestore instance.
 * @param businessId - The ID of the business.
 * @param data - The partial subscription data to update.
 */
export function updateSubscription(firestore: Firestore, businessId: string, data: Partial<Subscription>) {
    const subDocRef = doc(firestore, 'businesses', businessId, 'subscription', 'current');
    // Using setDoc with merge to both create and update.
    return setDoc(subDocRef, data, { merge: true });
}
