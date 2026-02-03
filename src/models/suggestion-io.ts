
import { z } from 'zod';
import type { Product } from './product';

export const SuggestionInputSchema = z.object({
  businessId: z.string(),
  productId: z.string(),
});
export type SuggestionInput = z.infer<typeof SuggestionInputSchema>;

export const SuggestionOutputSchema = z.object({
  suggestedProduct: z.custom<Product>().nullable(),
  suggestionType: z.enum(['cross-sell', 'upsell', 'bundle', 'none']),
  reason: z.string().optional(),
  ruleId: z.string().nullable(), // To track which rule generated the suggestion
});
export type SuggestionOutput = z.infer<typeof SuggestionOutputSchema>;
