import type { Timestamp } from 'firebase/firestore';

export interface SubscriptionPlan {
  id: 'free' | 'pro' | 'enterprise';
  name: string;
  price: number;
  limits: {
    products: number;        // -1 = ilimitado
    services: number;
    blogPosts: number;
    landingPages: number;
  };
  modules: string[];         // módulos habilitados
}

export interface Subscription {
  plan: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  paymentMethod?: string;
  currentPeriodEnd: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
