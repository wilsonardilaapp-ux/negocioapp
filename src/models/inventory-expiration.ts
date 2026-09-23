export interface InventoryBatch {
  id: string;
  businessId: string;
  productId: string; // Referencia por ID al producto, sin modificar el modelo Product
  batchNumber?: string;
  expirationDate: string; // Formato ISO YYYY-MM-DD o ISO 8601
  quantity: number;
  createdAt: string;
  updatedAt?: string;
}

export type ExpirationStatus = 'expired' | 'critical' | 'warning' | 'good';

export interface BatchExpirationSummary {
  batch: InventoryBatch;
  daysRemaining: number;
  status: ExpirationStatus;
}
