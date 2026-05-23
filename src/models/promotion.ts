
export interface Promotion {
  id: string;
  companyId: string;                            // Tenant ID — único identificador de empresa
  title: string;
  description: string;
  type: 'percentage' | 'fixed' | 'bogo' | 'free_item' | 'bundle';
  discountValue: number;                         // % o valor fijo. 0 si es bogo o free_item
  applicableTo: 'all_catalog' | 'category' | 'specific_item' | 'order';
  categoryName?: string;
  itemId?: string;                               // ID del producto/servicio específico
  itemName?: string;                             // Nombre del producto/servicio específico
  validFrom: string;                             // ISO date string
  validUntil: string;                            // ISO date string
  isActive: boolean;
  showInCatalog: boolean;                        // Mostrar en catálogo/vitrina pública
  showInCheckout: boolean;                       // Mostrar al momento de compra/reserva/orden
  minQuantity?: number;                          // Cantidad/unidades mínimas para aplicar
  usageLimit?: number;                           // 0 = ilimitado
  usageCount: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}
