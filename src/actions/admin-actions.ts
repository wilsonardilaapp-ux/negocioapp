'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import { revalidatePath } from 'next/cache';

/**
 * @fileOverview Acciones de administración global para mantenimiento de plataforma.
 */

export interface SyncPlatformBotResponse {
  success: boolean;
  purgedCount: number;
  confirmedPlans: string[];
  error?: string;
}

/**
 * Realiza una purga total y sincronización de los planes oficiales en el tenant platform-bot.
 * Esta acción garantiza que el asistente virtual lea los precios híbridos reales.
 */
export async function syncPlatformBotAction(): Promise<SyncPlatformBotResponse> {
  try {
    const db = await getAdminFirestore();
    const platformRef = db.collection('businesses').doc('platform-bot');
    const productsSubColRef = platformRef.collection('products');

    // 1. PURGA TOTAL (Batch Delete)
    const oldProductsSnap = await productsSubColRef.get();
    let purgedCount = 0;
    
    if (!oldProductsSnap.empty) {
      const purgeBatch = db.batch();
      oldProductsSnap.forEach(doc => {
        purgeBatch.delete(doc.ref);
        purgedCount++;
      });
      await purgeBatch.commit();
    }

    // 2. DEFINICIÓN DE PLANES OFICIALES (Modelo Híbrido)
    const officialPlans = [
      {
        id: 'plan-gratis',
        businessId: 'platform-bot',
        name: 'Plan Gratis / Inicio',
        price: 0,
        category: 'Planes',
        description: 'Plan Híbrido: Tarifa base $0/mes + 15% de comisión por cada pedido recibido a través de la plataforma.',
        stock: 9999,
        rating: 5,
        ratingCount: 1,
        updatedAt: new Date().toISOString()
      },
      {
        id: 'plan-basico',
        businessId: 'platform-bot',
        name: 'Plan Básico',
        price: 19900,
        category: 'Planes',
        description: 'Plan Híbrido: Tarifa base $19.900/mes + 10% de comisión por cada pedido recibido.',
        stock: 9999,
        rating: 5,
        ratingCount: 1,
        updatedAt: new Date().toISOString()
      },
      {
        id: 'plan-estandar',
        businessId: 'platform-bot',
        name: 'Plan Estándar',
        price: 39900,
        category: 'Planes',
        description: 'Plan Híbrido: Tarifa base $39.900/mes + 9% de comisión por cada pedido recibido.',
        stock: 9999,
        rating: 5,
        ratingCount: 1,
        updatedAt: new Date().toISOString()
      },
      {
        id: 'plan-profesional',
        businessId: 'platform-bot',
        name: 'Plan Profesional',
        price: 69900,
        category: 'Planes',
        description: 'Plan Híbrido: Tarifa base $69.900/mes + 8% de comisión por cada pedido recibido.',
        stock: 9999,
        rating: 5,
        ratingCount: 1,
        updatedAt: new Date().toISOString()
      }
    ];

    // 3. ESCRITURA ATÓMICA
    const syncBatch = db.batch();

    // A. Subcolección individual (para RAG e indexación)
    officialPlans.forEach(plan => {
      syncBatch.set(productsSubColRef.doc(plan.id), plan);
    });

    // B. Documento denormalizado (para respuesta rápida del Flow)
    syncBatch.set(platformRef.collection('publicData').doc('catalog'), {
      headerConfig: {
        businessInfo: {
          name: 'Markix Platform',
          address: 'Soporte Global Online',
          phone: '3228831634'
        }
      },
      products: officialPlans,
      updatedAt: new Date().toISOString()
    });

    await syncBatch.commit();

    // 4. VERIFICACIÓN DE LECTURA
    const verifySnap = await productsSubColRef.get();
    const confirmedPlans = verifySnap.docs.map(d => d.data().name);

    revalidatePath('/');
    
    return {
      success: true,
      purgedCount,
      confirmedPlans
    };

  } catch (error: any) {
    console.error('[syncPlatformBotAction] Error:', error.message);
    return {
      success: false,
      purgedCount: 0,
      confirmedPlans: [],
      error: error.message
    };
  }
}
