'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import { revalidatePath } from 'next/cache';

/**
 * @fileOverview Script de migración para reparar ratings de productos desincronizados.
 * 
 * Este script recalcula el rating y ratingCount basándose exclusivamente en los documentos
 * reales dentro de la subcolección /votes de cada producto.
 */

export type MigrationSummary = {
  totalProcessed: number;
  repaired: number;
  alreadyCorrect: number;
  noVotes: number;
  errors: string[];
};

export async function repairProductRatings(businessId: string): Promise<{ success: boolean; summary?: MigrationSummary; error?: string }> {
  if (!businessId) return { success: false, error: "Se requiere un Business ID válido." };

  try {
    const db = await getAdminFirestore();
    const summary: MigrationSummary = {
      totalProcessed: 0,
      repaired: 0,
      alreadyCorrect: 0,
      noVotes: 0,
      errors: []
    };

    // 1. Obtener todos los productos del negocio
    const productsRef = db.collection('businesses').doc(businessId).collection('products');
    const productsSnap = await productsRef.get();

    if (productsSnap.empty) {
      return { success: true, summary, error: "No se encontraron productos para este negocio." };
    }

    const repairedProductData: Record<string, { rating: number, ratingCount: number }> = {};

    // 2. Recorrer productos y recalcular desde /votes
    for (const productDoc of productsSnap.docs) {
      summary.totalProcessed++;
      const productId = productDoc.id;
      const currentData = productDoc.data();

      try {
        const votesRef = productDoc.ref.collection('votes');
        const votesSnap = await votesRef.get();

        if (votesSnap.empty) {
          summary.noVotes++;
          repairedProductData[productId] = { rating: 0, ratingCount: 0 };
          continue;
        }

        let totalSum = 0;
        const count = votesSnap.size;

        votesSnap.forEach(voteDoc => {
          const voteData = voteDoc.data();
          totalSum += Number(voteData.rating) || 0;
        });

        const realAverage = Number((totalSum / count).toFixed(2));
        const realCount = count;

        // Comparar con datos actuales
        if (currentData.rating !== realAverage || currentData.ratingCount !== realCount) {
          await productDoc.ref.update({
            rating: realAverage,
            ratingCount: realCount,
            updatedAt: new Date().toISOString()
          });
          summary.repaired++;
        } else {
          summary.alreadyCorrect++;
        }

        // Guardar para el sync del catálogo
        repairedProductData[productId] = { rating: realAverage, ratingCount: realCount };

      } catch (err: any) {
        summary.errors.push(`Error en producto ${productId}: ${err.message}`);
      }
    }

    // 3. Sincronizar el catálogo denormalizado (publicData/catalog)
    const catalogRef = db.collection('businesses').doc(businessId).collection('publicData').doc('catalog');
    const catalogSnap = await catalogRef.get();

    if (catalogSnap.exists) {
      const catalogData = catalogSnap.data();
      const catalogProducts = catalogData?.products || [];

      let catalogChanged = false;
      const updatedCatalogProducts = catalogProducts.map((p: any) => {
        const repairInfo = repairedProductData[p.id];
        if (repairInfo) {
          if (p.rating !== repairInfo.rating || p.ratingCount !== repairInfo.ratingCount) {
            catalogChanged = true;
            return {
              ...p,
              rating: repairInfo.rating,
              ratingCount: repairInfo.ratingCount
            };
          }
        }
        return p;
      });

      if (catalogChanged) {
        await catalogRef.update({ products: updatedCatalogProducts });
      }
    }

    revalidatePath(`/catalog/${businessId}`);
    return { success: true, summary };

  } catch (error: any) {
    console.error("[repairProductRatings] Critical Error:", error);
    return { success: false, error: error.message };
  }
}
