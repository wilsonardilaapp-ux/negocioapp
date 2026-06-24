
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { BusinessRatingsStats } from '@/components/directory/ratings/BusinessRatingsStats';
import { BusinessRatingsList } from '@/components/directory/ratings/BusinessRatingsList';
import { useBusinessRatings } from '@/hooks/useBusinessRatings';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Loader2, Star } from 'lucide-react';
import type { Business } from '@/models/business';

export default function BusinessRatingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { ratings, isLoading: isRatingsLoading } = useBusinessRatings();

  // Cargamos el documento del negocio para obtener la calificación real consolidada
  const businessDocRef = useMemoFirebase(() => 
    user ? doc(firestore, 'businesses', user.uid) : null,
    [user, firestore]
  );
  
  const { data: business, isLoading: isBusinessLoading } = useDoc<Business>(businessDocRef);

  const isLoading = isRatingsLoading || isBusinessLoading;

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Star className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Valoraciones del Directorio</CardTitle>
              <CardDescription>
                Gestiona las opiniones de tus clientes y mejora tu reputación en el directorio de negocios.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <BusinessRatingsStats 
        ratings={ratings} 
        businessRating={business?.rating}
        businessReviewCount={business?.reviewCount}
        businessDistribution={business?.ratingDistribution}
      />

      <Card>
        <CardHeader>
          <CardTitle>Listado de Opiniones</CardTitle>
          <CardDescription>Consulta lo que tus clientes dicen sobre tu negocio.</CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessRatingsList ratings={ratings} />
        </CardContent>
      </Card>
    </div>
  );
}
