
import Stripe from 'stripe';
import type { SubscriptionPlan } from '@/models/subscription';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20',
  typescript: true,
});

// Reemplaza estos IDs con los tuyos de tu dashboard de Stripe
export const STRIPE_PRICE_IDS = {
  FREE: 'price_free_placeholder',
  PRO: 'price_pro_placeholder',
  ENTERPRISE: 'price_enterprise_placeholder'
};

export const plans: Record<'free' | 'pro' | 'enterprise', string> = {
  free: STRIPE_PRICE_IDS.FREE,
  pro: STRIPE_PRICE_IDS.PRO,
  enterprise: STRIPE_PRICE_IDS.ENTERPRISE,
};

// Función para obtener el nombre del plan a partir de un Price ID
export function getPlanFromPriceId(priceId: string): 'free' | 'pro' | 'enterprise' | null {
  for (const [plan, id] of Object.entries(plans)) {
    if (id === priceId) {
      return plan as 'free' | 'pro' | 'enterprise';
    }
  }
  return null;
}
