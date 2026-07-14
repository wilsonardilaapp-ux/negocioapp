'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import { revalidatePath } from 'next/cache';
import { normalizePhoneNumber } from '@/lib/utils';
import type { Review, ReviewStatus } from '@/models/review';
import { grantLoyaltyPointsTransactional } from './loyalty';
import { handleNegativeReviewRecovery } from '@/services/recovery-service';

/**
 * Crea una nueva reseña de cliente en Firestore.
 * Implementa auto-aprobación para ratings altos y otorga bono de puntos si aplica.
 * Se ejecuta estrictamente en el servidor para proteger las credenciales de Admin.
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
      // 1. LECTURAS Y ESCRITURAS DE PUNTOS (Transaccional)
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

      // 2. ESCRITURA DE LA RESEÑA
      transaction.set(reviewsCol.doc(reviewId), reviewData);
    });

    // 3. DISPARADOR DE RECUPERACIÓN (IA)
    // Se activa solo para calificaciones de 1 o 2 estrellas con WhatsApp identificado
    if (data.rating <= 2 && reviewData.whatsapp) {
      // Esperamos el inicio del proceso de recuperación antes de finalizar la acción
      await handleNegativeReviewRecovery({
        businessId: data.businessId,
        name: data.name,
        whatsapp: reviewData.whatsapp,
        rating: data.rating,
        comment: data.comment,
        reviewId: reviewId,
      });
    }

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
    revalidatePath('/dashboard/loyalty');
    
    return { success: true };
  } catch (error: any) {
    console.error('[Action: moderateReview] Error:', error.message);
    return { success: false, error: 'Error al actualizar el estado de la reseña.' };
  }
}

/**
 * Actualiza o añade una respuesta del negocio a una reseña.
 */
export async function updateReviewReply(
  businessId: string,
  reviewId: string,
  reply: string
) {
  if (!businessId || !reviewId) {
    return { success: false, error: 'Faltan parámetros de identificación.' };
  }

  const db = await getAdminFirestore();
  const reviewRef = db.collection('businesses').doc(businessId).collection('reviews').doc(reviewId);

  try {
    await reviewRef.update({
      reply: reply,
      updatedAt: new Date().toISOString()
    });
    
    revalidatePath(`/catalog/${businessId}`);
    revalidatePath('/dashboard/loyalty');
    
    return { success: true };
  } catch (error: any) {
    console.error('[Action: updateReviewReply] Error:', error.message);
    return { success: false, error: 'No se pudo guardar la respuesta.' };
  }
}

/**
 * Realiza la eliminación lógica de una reseña marcándola como 'deleted'.
 * Incluye datos de auditoría para el seguimiento administrativo.
 */
export async function deleteReview(businessId: string, reviewId: string, adminId: string) {
  if (!businessId || !reviewId || !adminId) {
    return { success: false, error: 'Datos de identificación insuficientes.' };
  }

  try {
    const db = await getAdminFirestore();
    const reviewRef = db.collection('businesses').doc(businessId).collection('reviews').doc(reviewId);

    await reviewRef.update({
      status: 'deleted',
      deletedAt: new Date().toISOString(),
      deletedBy: adminId,
      updatedAt: new Date().toISOString(),
    });

    revalidatePath(`/catalog/${businessId}`);
    revalidatePath('/dashboard/loyalty');
    
    return { success: true };
  } catch (error: any) {
    console.error('[Action: deleteReview] Error:', error.message);
    return { success: false, error: 'No se pudo eliminar la reseña.' };
  }
}
