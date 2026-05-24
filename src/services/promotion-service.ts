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
    // Usamos solo la fecha (YYYY-MM-DD) para la comparación, evitando problemas con la hora del ISO
    const today = new Date().toISOString().split('T')[0];
    
    const q = query(
      collection(db, 'promotions'), 
      where('companyId', '==', companyId),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Promotion))
      .filter(p => {
          // Si la fecha de fin es mayor o igual a hoy, la promoción es válida
          // No filtramos por validFrom de forma estricta aquí para permitir promociones pre-cargadas 
          // que el usuario activó manualmente (según el comportamiento reportado).
          return p.validUntil >= today;
      });
  }

  async createPromotion(data: CreatePromotionInput): Promise<string> {
    const db = this.getDb();
    const now = new Date().toISOString();
    
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
