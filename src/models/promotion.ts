
export interface Promotion {
  id: string;
  companyId: string; // Tenant ID (businessId)
  title: string;
  description: string;
  type: 'percentage' | 'fixed' | 'bogo' | 'free_item' | 'bundle';
  discountValue: number;
  applicableTo: 'all_catalog' | 'category' | 'specific_item' | 'order';
  categoryName?: string;
  itemId?: string;
  itemName?: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  showInCatalog: boolean;
  showInCheckout: boolean;
  minQuantity?: number;
  usageLimit?: number; // 0 = ilimitado
  usageCount: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}
