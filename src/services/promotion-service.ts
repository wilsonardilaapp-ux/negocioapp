
'use client';

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  increment,
  getFirestore,
  Firestore
} from 'firebase/firestore';
import type { Promotion } from '@/models/promotion';

export type CreatePromotionInput = Omit<Promotion, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>;

class PromotionService {
  private getDb(): Firestore {
    return getFirestore();
  }

  async getPromotionsByCompany(companyId: string): Promise<Promotion[]> {
    const db = this.getDb();
    const q = query(collection(db, 'promotions'), where('companyId', '==', companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Promotion));
  }

  async getActivePromotions(companyId: string): Promise<Promotion[]> {
    const db = this.getDb();
    const now = new Date().toISOString();
    const q = query(
      collection(db, 'promotions'), 
      where('companyId', '==', companyId),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Promotion))
      .filter(p => p.validUntil >= now);
  }

  async createPromotion(data: CreatePromotionInput): Promise<string> {
    const db = this.getDb();
    const now = new Date().toISOString();
    
    // Limpieza de seguridad para evitar enviar campos prohibidos
    const cleanData = { ...data };
    
    const docRef = await addDoc(collection(db, 'promotions'), {
      ...cleanData,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  }

  async updatePromotion(id: string, updates: Partial<Promotion>): Promise<void> {
    const db = this.getDb();
    const ref = doc(db, 'promotions', id);
    
    // CRÍTICO: Eliminar el campo 'id' de los updates, ya que Firestore no permite actualizarlo internamente
    const { id: _, ...cleanUpdates } = updates as any;
    
    await updateDoc(ref, {
      ...cleanUpdates,
      updatedAt: new Date().toISOString(),
    });
  }

  async deletePromotion(id: string): Promise<void> {
    const db = this.getDb();
    await deleteDoc(doc(db, 'promotions', id));
  }

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const db = this.getDb();
    await updateDoc(doc(db, 'promotions', id), {
      isActive,
      updatedAt: new Date().toISOString(),
    });
  }

  async incrementUsage(id: string): Promise<void> {
    const db = this.getDb();
    const ref = doc(db, 'promotions', id);
    await updateDoc(ref, {
      usageCount: increment(1),
      updatedAt: new Date().toISOString(),
    });
  }
}

export const promotionService = new PromotionService();
