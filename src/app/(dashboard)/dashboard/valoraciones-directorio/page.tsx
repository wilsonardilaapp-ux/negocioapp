
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { BusinessRatingsStats } from '@/components/directory/ratings/BusinessRatingsStats';
import { BusinessRatingsList } from '@/components/directory/ratings/BusinessRatingsList';
import { useBusinessRatings } from '@/hooks/useBusinessRatings';
import { Loader2, Star } from 'lucide-react';

export default function BusinessRatingsPage() {
  const { ratings, isLoading, error } = useBusinessRatings();

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

      <BusinessRatingsStats ratings={ratings} />

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
