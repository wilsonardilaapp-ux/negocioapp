import { z } from 'zod';

export const RateProductInputSchema = z.object({
  businessId: z.string().describe('The ID of the business that owns the product.'),
  productId: z.string().describe('The ID of the product to rate.'),
  rating: z.number().min(1).max(5).describe('The rating value from 1 to 5.'),
});

export type RateProductInput = z.infer<typeof RateProductInputSchema>;
