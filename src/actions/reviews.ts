'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import { revalidatePath } from 'next/cache';
import { normalizePhoneNumber } from '@/lib/utils';
import type { Review, ReviewStatus } from '@/models/review';
import { grantLoyaltyPointsTransactional } from './loyalty';

/**
 * Crea una nueva reseña de cliente en Firestore.
 * Implementa auto-aprobación para ratings altos y otorga bono de puntos si aplica.
 */
export async function createReview(data: {
  businessId: string;
  name: string;
  whatsapp?: string;
  rating: number;
  comment: string;
}) {
  if (!data.businessId || !data.name || !data.rating || !data.comment) {
    return { success: false, error: 'Faltan campos obligatorios.' };
  }

  const db = await getAdminFirestore();
  const reviewsCol = db.collection('businesses').doc(data.businessId).collection('reviews');
  const reviewId = reviewsCol.doc().id;
  const now = new Date().toISOString();

  // Lógica de estado inicial
  const status: ReviewStatus = data.rating >= 4 ? 'approved' : 'pending';

  const reviewData: any = {
    id: reviewId,
    businessId: data.businessId,
    name: data.name,
    rating: data.rating,
    comment: data.comment,
    status,
    createdAt: now,
    updatedAt: now,
  };

  if (data.whatsapp) {
    reviewData.whatsapp = normalizePhoneNumber(data.whatsapp);
  }

  try {
    await db.runTransaction(async (transaction) => {
      // 1. Guardar el documento de la reseña
      transaction.set(reviewsCol.doc(reviewId), reviewData);

      // 2. Otorgar bono de lealtad si el cliente está identificado
      if (reviewData.whatsapp) {
        await grantLoyaltyPointsTransactional(
          transaction,
          db,
          data.businessId,
          reviewData.whatsapp,
          10, // Bono fijo de +10 pts
          'Bono por reseña',
          `earn_review_${reviewId}`
        );
      }
    });

    revalidatePath(`/catalog/${data.businessId}`);
    return { success: true };
  } catch (error: any) {
    console.error('[Action: createReview] Error:', error.message);
    return { success: false, error: 'Error técnico al guardar la reseña.' };
  }
}

/**
 * Actualiza el estado de una reseña desde el panel administrativo.
 */
export async function moderateReview(
  businessId: string,
  reviewId: string,
  newStatus: ReviewStatus,
  reply?: string
) {
  if (!businessId || !reviewId || !newStatus) {
    return { success: false, error: 'Datos insuficientes para moderación.' };
  }

  const db = await getAdminFirestore();
  const reviewRef = db.collection('businesses').doc(businessId).collection('reviews').doc(reviewId);

  try {
    const updates: any = {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    
    if (reply !== undefined) {
      updates.reply = reply;
    }

    await reviewRef.update(updates);
    revalidatePath(`/catalog/${businessId}`);
    
    return { success: true };
  } catch (error: any) {
    console.error('[Action: moderateReview] Error:', error.message);
    return { success: false, error: 'Error al actualizar el estado de la reseña.' };
  }
}
