'use server';
/**
 * @fileOverview A flow for rating a product.
 *
 * - rateProduct - A function that handles updating a product's rating.
 * - RateProductInput - The input type for the rateProduct function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAdminFirestore } from '@/firebase/server-init';
import type { Product } from '@/models/product';
import { RateProductInput, RateProductInputSchema } from '@/models/rate-product-input';


// This is the wrapper function that will be called from the client.
export async function rateProduct(input: RateProductInput): Promise<{ success: boolean; message: string; rating?: number; ratingCount?: number }> {
  return rateProductFlow(input);
}

const rateProductFlow = ai.defineFlow(
  {
    name: 'rateProductFlow',
    inputSchema: RateProductInputSchema,
    outputSchema: z.object({ 
      success: z.boolean(), 
      message: z.string(),
      rating: z.number().optional(),
      ratingCount: z.number().optional()
    }),
  },
  async (input) => {
    const firestore = await getAdminFirestore();
    
    const productRef = firestore.collection('businesses').doc(input.businessId).collection('products').doc(input.productId);
    const catalogRef = firestore.collection('businesses').doc(input.businessId).collection('publicData').doc('catalog');
    
    try {
      return await firestore.runTransaction(async (transaction) => {
        // --- PASO 1: TODAS LAS LECTURAS PRIMERO (REGLA DE FIRESTORE) ---
        const productDoc = await transaction.get(productRef);
        const catalogDoc = await transaction.get(catalogRef);

        if (!productDoc.exists) {
          throw new Error(`El producto no existe.`);
        }

        if (!catalogDoc.exists) {
          // Lanza error explícito si el catálogo no existe en vez de fallar silenciosamente
          throw new Error("El documento de catálogo denormalizado no existe. Sincronización imposible.");
        }

        // --- PASO 2: CÁLCULOS ---
        const productData = productDoc.data() as Product;
        const currentRating = Number(productData.rating) || 0;
        const currentRatingCount = Number(productData.ratingCount) || 0;

        const newRatingCount = currentRatingCount + 1;
        const newTotalRating = (currentRating * currentRatingCount) + input.rating;
        const newAverage = Number((newTotalRating / newRatingCount).toFixed(2));

        const ratingUpdates = {
          rating: newAverage,
          ratingCount: newRatingCount,
        };

        const catalogData = catalogDoc.data();
        const products = catalogData?.products || [];
        const productIndex = products.findIndex((p: any) => p.id === input.productId);
        
        if (productIndex !== -1) {
          // Actualizar ítem existente
          products[productIndex] = {
            ...products[productIndex],
            ...ratingUpdates
          };
        } else {
          // Si el producto no estaba en el array, lo agregamos completo con el nuevo rating
          // Esto soluciona desincronizaciones previas
          products.push({
            ...productData,
            id: input.productId,
            ...ratingUpdates
          });
        }

        // --- PASO 3: TODAS LAS ESCRITURAS AL FINAL ---
        transaction.update(productRef, ratingUpdates);
        transaction.update(catalogRef, { products });

        return { 
          success: true, 
          message: 'Calificación actualizada y sincronizada.',
          rating: newAverage,
          ratingCount: newRatingCount
        };
      });

    } catch (e: any) {
        console.error("[rateProductFlow] Error en transacción:", e.message);
        return { 
          success: false, 
          message: e.message || 'Error interno del servidor al procesar la calificación.' 
        };
    }
  }
);
