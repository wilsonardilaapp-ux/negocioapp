/**
 * @fileOverview Definición del modelo de reseñas para negocios.
 */

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface Review {
  id: string;
  businessId: string;
  name: string;
  whatsapp?: string;
  rating: number; // Escala 1-5
  comment: string;
  status: ReviewStatus;
  reply?: string;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
}
