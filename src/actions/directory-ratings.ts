'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import type { DirectoryRating, RatingStatus } from '@/models/directory-rating';
import type { Business } from '@/models/business';
import { revalidatePath } from 'next/cache';

/**
 * Actualiza los agregados de calificación de un negocio basándose en sus reseñas publicadas.
 */
export async function updateBusinessAggregates(businessId: string) {
    const db = await getAdminFirestore();
    const businessRef = db.collection('businesses').doc(businessId);
    const ratingsRef = db.collection('directoryRatings');

    try {
        await db.runTransaction(async (transaction) => {
            // 1. Obtener todas las valoraciones publicadas del negocio
            const snapshot = await ratingsRef
                .where('businessId', '==', businessId)
                .where('status', '==', 'published')
                .get();

            const distribution: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
            let totalRatingSum = 0;
            let reviewCount = 0;

            snapshot.forEach(doc => {
                const data = doc.data() as DirectoryRating;
                const r = Math.round(data.rating).toString();
                if (distribution[r] !== undefined) {
                    distribution[r]++;
                }
                totalRatingSum += data.rating;
                reviewCount++;
            });

            const averageRating = reviewCount > 0 ? Number((totalRatingSum / reviewCount).toFixed(1)) : 5;

            // 2. Actualizar el documento del negocio
            transaction.update(businessRef, {
                rating: averageRating,
                reviewCount: reviewCount,
                ratingDistribution: distribution,
                updatedAt: new Date().toISOString()
            });
        });

        revalidatePath(`/negocio/${businessId}`);
        revalidatePath('/directorio');
    } catch (error) {
        console.error('Error actualizando agregados de negocio:', error);
        throw error;
    }
}

/**
 * Registra una nueva valoración con reglas automáticas de publicación.
 */
export async function submitBusinessRating(data: {
    businessId: string;
    businessName: string;
    userId: string;
    userName: string;
    rating: number;
    comment: string;
}) {
    const db = await getAdminFirestore();
    const now = new Date().toISOString();

    // Regla automática: 4-5 estrellas se publican, 1-3 quedan pendientes
    const status: RatingStatus = data.rating >= 4 ? 'published' : 'pending';

    const newRating: Omit<DirectoryRating, 'id'> = {
        ...data,
        status,
        createdAt: now,
        updatedAt: now,
    };

    try {
        const docRef = await db.collection('directoryRatings').add(newRating);

        // Si se publicó automáticamente, actualizamos los indicadores del negocio
        if (status === 'published') {
            await updateBusinessAggregates(data.businessId);
        }

        return { success: true, status, id: docRef.id };
    } catch (error: any) {
        console.error('Error al enviar valoración:', error);
        return { success: false, error: error.message };
    }
}
