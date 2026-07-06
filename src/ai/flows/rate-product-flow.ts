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
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists) {
          throw new Error(`Product not found at: ${productRef.path}`);
        }

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

        // 1. Actualizar el documento de producto individual (Fuente de Verdad)
        transaction.update(productRef, ratingUpdates);

        // 2. Sincronizar con el catálogo público denormalizado
        const catalogDoc = await transaction.get(catalogRef);
        
        if (!catalogDoc.exists) {
          throw new Error("Critical: Catalog document does not exist. Synchronization failed.");
        }

        const catalogData = catalogDoc.data();
        const products = catalogData?.products || [];
        const productIndex = products.findIndex((p: any) => p.id === input.productId);
        
        console.log(`[rateProductFlow] Syncing catalog for product ${input.productId}. Found at index: ${productIndex}`);

        if (productIndex !== -1) {
          // Actualizar solo el producto específico dentro del array
          products[productIndex] = {
            ...products[productIndex],
            ...ratingUpdates
          };
        } else {
          // BUG FIX: Si no existe en el array, lo agregamos completo con los nuevos ratings
          console.warn(`[rateProductFlow] Product ${input.productId} missing from catalog array. Adding now.`);
          products.push({
            ...productData,
            id: input.productId,
            ...ratingUpdates
          });
        }

        transaction.update(catalogRef, { products });

        return { 
          success: true, 
          message: 'Rating updated and synced successfully in all sources.',
          rating: newAverage,
          ratingCount: newRatingCount
        };
      });

    } catch (e: any) {
        console.error("[rateProductFlow] Critical Error:", e.message);
        return { 
          success: false, 
          message: e.message || 'Failed to update rating due to a server-side error.' 
        };
    }
  }
);
