import { z } from 'zod';

export const HybridPlanSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'El nombre es requerido'),
  slug: z.string().min(1, 'El slug es requerido'),
  basePrice: z.number().min(0, 'La tarifa base no puede ser negativa'),
  pricePerOrder: z.number().min(0, 'La comisión por pedido no puede ser negativa'),
  commissionType: z.enum(['fixed', 'percent']),
  variableBillingFrequency: z.enum(['weekly', 'monthly']),
  isActive: z.boolean(),
  isPublic: z.boolean(),
  includedModuleKeys: z.array(z.string()),
  features: z.array(z.object({ value: z.string() })),
  limits: z.object({
    products: z.number(),
    blogPosts: z.number(),
    landingPages: z.number(),
    promotions: z.number(),
    coupons: z.number(),
    orders: z.number(),
    suggestions: z.number(),
  }),
});

export type HybridPlan = z.infer<typeof HybridPlanSchema>;

export type HybridBillingResult = {
  businessId: string;
  businessName: string;
  ownerEmail: string;
  phone?: string;
  planName: string;
  basePrice: number;
  orderCount: number;
  ordersTotalValue: number;
  variableAmount: number;
  totalAmount: number;
  status: 'pending' | 'paid';
  paymentMethod?: string;
};
