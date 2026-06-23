'use client';

/**
 * @fileOverview Firestore service for the Business Directory module.
 * Updated to use 'businesses' collection as the single source of truth.
 */

import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  type Firestore
} from 'firebase/firestore';

class BusinessDirectoryService {
  private getDb(): Firestore {
    return getFirestore();
  }

  /**
   * Retrieves a directory entry for a specific business from the main 'businesses' collection.
   * Only returns the entry if the business status is 'active'.
   */
  async getEntryByBusiness(businessId: string): Promise<any | null> {
    const db = this.getDb();
    // Querying the 'businesses' collection directly as per requirement
    const q = query(
      collection(db, 'businesses'), 
      where('id', '==', businessId),
      where('status', '==', 'active')
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  }

  /**
   * Creates a new directory entry.
   * @deprecated Creation is now handled via the main business registration process.
   */
  async createEntry(_data: any): Promise<string> {
    // This method is no longer needed as businesses are created in the main collection.
    // We return an empty string to maintain signature compatibility if called.
    console.warn("createEntry is deprecated. Businesses are now managed in the 'businesses' collection.");
    return "";
  }

  /**
   * Updates a business entry directly in the 'businesses' collection.
   */
  async updateEntry(id: string, updates: Partial<any>): Promise<void> {
    const db = this.getDb();
    // Updating the document in the 'businesses' collection
    const ref = doc(db, 'businesses', id);
    await updateDoc(ref, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }
}

export const businessDirectoryService = new BusinessDirectoryService();
