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
  Firestore,
  setDoc
} from 'firebase/firestore';
import type { Promotion } from '@/models/promotion';
import type { Product } from '@/models/product';

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
    const today = new Date().toISOString().split('T')[0];
    
    // CRITICAL FIX: Added 'showInCatalog' filter to match Firestore Security Rules.
    // In Firestore, "rules are not filters". Queries must match the constraints
    // defined in firestore.rules to be allowed for public/unauthenticated users.
    const q = query(
      collection(db, 'promotions'), 
      where('companyId', '==', companyId),
      where('isActive', '==', true),
      where('showInCatalog', '==', true)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Promotion))
      .filter(p => {
          // Additional safety check for validity period
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
    const ref = doc(db, 'cupones', id);
    await updateDoc(ref, {
      usosActuales: increment(1),
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Sincroniza las promociones activas con el catálogo público denormalizado.
   * Utiliza setDoc con merge para no afectar otros campos como productos o encabezado.
   */
  async syncPublicCatalog(companyId: string): Promise<void> {
    try {
      const activePromos = await this.getActivePromotions(companyId);
      const db = this.getDb();
      const publicCatalogRef = doc(db, 'businesses', companyId, 'publicData', 'catalog');
      
      await setDoc(publicCatalogRef, { 
        promotions: activePromos,
        lastPromoSyncAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error("[PromotionService] Error al sincronizar catálogo público:", error);
    }
  }

  /**
   * Calcula el precio final de un producto basándose en un array de promociones activas.
   * Prioriza la primera promoción válida encontrada que afecte al precio (porcentual o fija).
   * 
   * @param product El producto al que se le desea aplicar el descuento.
   * @param promotions El array de promociones activas cargadas para el negocio.
   */
  calculateDiscountedPrice(product: Product, promotions: Promotion[]): { 
    hasDiscount: boolean; 
    originalPrice: number; 
    finalPrice: number; 
    promotion: Promotion | null; 
  } {
    const originalPrice = product.price;
    
    // Buscar la primera promoción aplicable que afecte al precio unitario (porcentual o fija)
    const applicablePromotion = (promotions || []).find(p => {
      if (!p.isActive) return false;
      
      // Comprobar si la promoción aplica al producto específico, categoría o a todo el catálogo
      const appliesToItem = 
        p.applicableTo === 'all_catalog' || 
        (p.applicableTo === 'specific_item' && p.itemId === product.id) ||
        (p.applicableTo === 'category' && p.categoryName === product.category);
      
      // Solo procesamos tipos que afectan el precio directamente aquí
      return appliesToItem && (p.type === 'percentage' || p.type === 'fixed');
    }) || null;

    if (!applicablePromotion) {
      return { hasDiscount: false, originalPrice, finalPrice: originalPrice, promotion: null };
    }

    let finalPrice = originalPrice;
    if (applicablePromotion.type === 'percentage') {
      finalPrice = originalPrice * (1 - (applicablePromotion.discountValue / 100));
    } else if (applicablePromotion.type === 'fixed') {
      finalPrice = Math.max(0, originalPrice - applicablePromotion.discountValue);
    }

    return {
      hasDiscount: finalPrice < originalPrice,
      originalPrice,
      finalPrice: Math.round(finalPrice), // Redondeo para evitar decimales en precios de catálogo
      promotion: applicablePromotion
    };
  }
}

export const promotionService = new PromotionService();
