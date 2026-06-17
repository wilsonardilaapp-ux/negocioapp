import type { Product } from './product';

export interface AppliedPromotion {
  type: '2x1' | 'percentage' | 'fixed';
  originalPrice: number;
  discountedPrice: number;
  promotionId: string;
}

export type CartItem = Product & { 
    quantity: number;
    appliedPromotion?: AppliedPromotion;
};
