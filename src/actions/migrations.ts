'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import { revalidatePath } from 'next/cache';

/**
 * @fileOverview Script de migración para reparar ratings de productos desincronizados
 * y sincronizar claves de beneficios de planes.
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

/**
 * Mapeo automático de groupKeys para Planes Híbridos basado en el significado del texto.
 * También limpia notas internas accidentales en las descripciones.
 */
export async function syncHybridPlanKeys() {
  const db = await getAdminFirestore();
  const hybridRef = db.collection('hybrid_plans');
  
  try {
    const snapshot = await hybridRef.get();
    if (snapshot.empty) return { success: true, message: "No hay planes híbridos para procesar." };

    const batch = db.batch();
    let updatedCount = 0;

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (!data.features || !Array.isArray(data.features)) return;

      const updatedFeatures = data.features.map((f: any) => {
        let textValue = f.value || "";
        
        // --- LIMPIEZA QUIRÚRGICA DE TEXTO ---
        // Eliminamos "(Debe super al plan basico)" preservando el resto
        const cleanTextValue = textValue.replace(/\(Debe super al plan basico\)/g, '').trim();

        const textForMatch = cleanTextValue.toLowerCase();
        let key = f.groupKey || null; // Usar null en lugar de undefined para Firestore

        // Lógica de match según el significado
        if (textForMatch.includes('producto')) key = 'productos';
        else if (textForMatch.includes('blog') || textForMatch.includes('artículo')) key = 'posts_blog';
        else if (textForMatch.includes('landing')) key = 'landing_pages';
        else if (textForMatch.includes('soporte') || textForMatch.includes('asistencia')) key = 'soporte';
        else if (textForMatch.includes('pedido') || textForMatch.includes('orden') || textForMatch.includes('comisión')) key = 'pedidos';
        else if (textForMatch.includes('sugerencia') || textForMatch.includes('ia') || textForMatch.includes('inteligente')) key = 'sugerencias';
        else if (textForMatch.includes('api')) key = 'api';
        else if (textForMatch.includes('onboarding') || textForMatch.includes('acompañamiento')) key = 'onboarding';
        else if (textForMatch.includes('usuario') || textForMatch.includes('staff')) key = 'usuarios';
        else if (textForMatch.includes('chatbot')) key = 'chatbot';

        return { ...f, value: cleanTextValue, groupKey: key };
      });

      // BLINDAJE: Solo actualizamos el array features
      batch.update(docSnap.ref, { features: updatedFeatures });
      updatedCount++;
    });

    await batch.commit();
    revalidatePath('/superadmin/hybrid-plans');
    return { success: true, message: `Se han actualizado las descripciones y claves de ${updatedCount} planes híbridos.` };

  } catch (error: any) {
    console.error("[syncHybridPlanKeys] Error:", error);
    return { success: false, error: error.message };
  }
}
