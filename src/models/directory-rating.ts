/**
 * @fileOverview Definición del modelo de valoraciones para el directorio de negocios.
 */

export type RatingStatus = 'pending' | 'published' | 'hidden' | 'rejected' | 'reported';

export interface DirectoryRating {
  id: string;
  businessId: string;
  businessName: string;
  userId?: string; // Opcional para soportar invitados
  userName: string; // En invitados, mapea a guestName
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  authType: 'registered' | 'guest';
  rating: number; // Valor de 1 a 5
  comment: string;
  status: RatingStatus;
  adminResponse?: string;
  businessResponse?: string;
  createdAt: string; // Formato ISO
  updatedAt: string; // Formato ISO
}
