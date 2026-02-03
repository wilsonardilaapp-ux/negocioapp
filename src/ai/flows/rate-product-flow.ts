
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
    
    // Using Admin SDK requires direct doc reference like this.
    const productRef = firestore.collection('businesses').doc(input.businessId).collection('products').doc(input.productId);
    
    try {
      // Replaced runTransaction with a manual get-and-update pattern,
      // which is more reliable with the Admin SDK in this context.
      const productDoc = await productRef.get();
      if (!productDoc.exists) {
        throw new Error("Product not found!");
      }

      const productData = productDoc.data() as Product;
      const currentRating = productData.rating || 0;
      const currentRatingCount = productData.ratingCount || 0;

      const newRatingCount = currentRatingCount + 1;
      const newTotalRating = (currentRating * currentRatingCount) + input.rating;
      const newAverage = newTotalRating / newRatingCount;

      const updatedData = {
        rating: newAverage,
        ratingCount: newRatingCount,
      };

      await productRef.update(updatedData);

      return { success: true, message: 'Rating updated successfully.' };

    } catch (e: any) {
        // Although this is a server-side flow, we can still emit the error.
        // The error listener on the client won't pick it up, but it standardizes our error pattern.
        // The client will receive the failure from the flow's return value.
        const permissionError = new FirestorePermissionError({
            path: productRef.path,
            operation: 'update',
            // In a real scenario, you'd pass what you attempted to write.
            // For simplicity, we are just noting the operation.
        });
        
        // This won't show in the Next.js overlay but is good practice.
        console.error("GENKIT_FLOW_ERROR:", permissionError.message);

        // Make the flow fail with a descriptive message.
        return { success: false, message: e.message || 'Failed to update rating due to a server-side error.' };
    }
  }
);
