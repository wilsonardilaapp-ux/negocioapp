'use client';

import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  increment,
  limit
} from 'firebase/firestore';
import type { Coupon } from '@/models/coupon';

class CouponService {
  private getDb() {
    return getFirestore();
  }

  async getCouponsByBusiness(businessId: string): Promise<Coupon[]> {
    const db = this.getDb();
    const q = query(collection(db, 'cupones'), where('businessId', '==', businessId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon));
  }

  async createCoupon(data: Omit<Coupon, 'id' | 'createdAt' | 'updatedAt' | 'usosActuales'>): Promise<string> {
    const db = this.getDb();
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'cupones'), {
      ...data,
      usosActuales: 0,
      createdAt: now,
      updatedAt: now,
    });
    return docRef.id;
  }

  async updateCoupon(id: string, updates: Partial<Coupon>): Promise<void> {
    const db = this.getDb();
    const { id: _, ...cleanUpdates } = updates as any;
    await updateDoc(doc(db, 'cupones', id), {
      ...cleanUpdates,
      updatedAt: new Date().toISOString(),
    });
  }

  async deleteCoupon(id: string): Promise<void> {
    const db = this.getDb();
    await deleteDoc(doc(db, 'cupones', id));
  }

  async validateCoupon(businessId: string, code: string, currentTotal: number): Promise<{ success: boolean; coupon?: Coupon; error?: string }> {
    const db = this.getDb();
    const q = query(
      collection(db, 'cupones'), 
      where('businessId', '==', businessId),
      where('codigo', '==', code.toUpperCase().trim()),
      where('activo', '==', true),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return { success: false, error: 'Cupón no válido o inexistente.' };
    }

    const coupon = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Coupon;
    const now = new Date();
    const expiry = new Date(coupon.fechaVencimiento);

    if (expiry < now) {
      return { success: false, error: 'Este cupón ha expirado.' };
    }

    if (coupon.limiteUsos > 0 && coupon.usosActuales >= coupon.limiteUsos) {
      return { success: false, error: 'Este cupón ha agotado su límite de usos.' };
    }

    if (currentTotal < coupon.montoMinimo) {
      return { success: false, error: `El monto mínimo para este cupón es ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(coupon.montoMinimo)}.` };
    }

    return { success: true, coupon };
  }

  async incrementUsage(id: string): Promise<void> {
    const db = this.getDb();
    const ref = doc(db, 'cupones', id);
    await updateDoc(ref, {
      usosActuales: increment(1),
      updatedAt: new Date().toISOString()
    });
  }
}

export const couponService = new CouponService();
