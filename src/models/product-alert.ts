/**
 * @fileOverview Modelo para las alertas de productos con baja valoración.
 */

export type AlertStatus = 'pending' | 'reviewed' | 'resolved';

export interface ProductAlert {
  id: string;
  businessId: string;
  productId: string;
  productName: string;
  rating: number;
  ratingCount: number;
  status: AlertStatus;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
}
