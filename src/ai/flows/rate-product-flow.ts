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
import { FirestorePermissionError } from '@/firebase/errors';
import { RateProductInput, RateProductInputSchema } from '@/models/rate-product-input';


// This is the wrapper function that will be called from the client.
export async function rateProduct(input: RateProductInput): Promise<{ success: boolean; message: string }> {
  return rateProductFlow(input);
}

const rateProductFlow = ai.defineFlow(
  {
    name: 'rateProductFlow',
    inputSchema: RateProductInputSchema,
    outputSchema: z.object({ success: z.boolean(), message: z.string() }),
  },
  async (input) => {
    // Genkit flows run in a server environment, so we need to initialize
    // a server-side firestore client.
    const firestore = await getAdminFirestore();
    
    // References for atomic update
    const productRef = firestore.collection('businesses').doc(input.businessId).collection('products').doc(input.productId);
    const catalogRef = firestore.collection('businesses').doc(input.businessId).collection('publicData').doc('catalog');
    
    try {
      // Usar runTransaction para garantizar consistencia entre el producto y el catálogo denormalizado
      return await firestore.runTransaction(async (transaction) => {
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists) {
          throw new Error("Product not found!");
        }

        const productData = productDoc.data() as Product;
        const currentRating = productData.rating || 0;
        const currentRatingCount = productData.ratingCount || 0;

        const newRatingCount = currentRatingCount + 1;
        const newTotalRating = (currentRating * currentRatingCount) + input.rating;
        const newAverage = newTotalRating / newRatingCount;

        const ratingUpdates = {
          rating: newAverage,
          ratingCount: newRatingCount,
        };

        // 1. Actualizar el documento de producto individual (Fuente de Verdad)
        transaction.update(productRef, ratingUpdates);

        // 2. Sincronizar con el catálogo público denormalizado
        const catalogDoc = await transaction.get(catalogRef);
        if (catalogDoc.exists) {
          const catalogData = catalogDoc.data();
          const products = catalogData.products || [];
          const productIndex = products.findIndex((p: any) => p.id === input.productId);
          
          if (productIndex !== -1) {
            // Actualizar solo el producto específico dentro del array denormalizado
            products[productIndex] = {
              ...products[productIndex],
              ...ratingUpdates
            };
            transaction.update(catalogRef, { products });
          }
        }

        return { success: true, message: 'Rating updated and synced successfully in all sources.' };
      });

    } catch (e: any) {
        // Although this is a server-side flow, we can still emit the error.
        // The error listener on the client won't pick it up, but it standardizes our error pattern.
        // The client will receive the failure from the flow's return value.
        const permissionError = new FirestorePermissionError({
            path: productRef.path,
            operation: 'update',
        });
        
        console.error("GENKIT_FLOW_ERROR:", permissionError.message);

        return { success: false, message: e.message || 'Failed to update rating due to a server-side error.' };
    }
  }
);
