/**
 * @fileOverview Definición del modelo de valoraciones para el directorio de negocios.
 */

export type RatingStatus = 'pending' | 'published' | 'hidden' | 'rejected' | 'reported';

export interface DirectoryRating {
  id: string;
  businessId: string;
  businessName: string;
  userId: string;
  userName: string;
  rating: number; // Valor de 1 a 5
  comment: string;
  status: RatingStatus;
  adminResponse?: string;
  businessResponse?: string;
  createdAt: string; // Formato ISO
  updatedAt: string; // Formato ISO
}
