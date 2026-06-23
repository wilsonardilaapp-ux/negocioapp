
'use client';

/**
 * @fileOverview Firestore service for the Business Directory module.
 */

import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  type Firestore
} from 'firebase/firestore';
import type { BusinessDirectoryEntry } from '@/models/business-directory';

class BusinessDirectoryService {
  private getDb(): Firestore {
    return getFirestore();
  }

  /**
   * Retrieves a directory entry for a specific business.
   */
  async getEntryByBusiness(businessId: string): Promise<BusinessDirectoryEntry | null> {
    const db = this.getDb();
    const q = query(collection(db, 'businessDirectory'), where('businessId', '==', businessId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as BusinessDirectoryEntry;
  }

  /**
   * Creates a new directory entry.
   */
  async createEntry(data: Omit<BusinessDirectoryEntry, 'id' | 'listingDate' | 'updatedAt'>): Promise<string> {
    const db = this.getDb();
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'businessDirectory'), {
      ...data,
      listingDate: now,
      updatedAt: now,
    });
    return docRef.id;
  }

  /**
   * Updates an existing directory entry.
   */
  async updateEntry(id: string, updates: Partial<BusinessDirectoryEntry>): Promise<void> {
    const db = this.getDb();
    const ref = doc(db, 'businessDirectory', id);
    await updateDoc(ref, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }
}

export const businessDirectoryService = new BusinessDirectoryService();
