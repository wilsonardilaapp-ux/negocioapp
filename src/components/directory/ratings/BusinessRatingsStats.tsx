
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Star } from 'lucide-react';
import type { DirectoryRating } from '@/models/directory-rating';

interface BusinessRatingsStatsProps {
  ratings: DirectoryRating[];
}

export function BusinessRatingsStats({ ratings }: BusinessRatingsStatsProps) {
  const stats = useMemo(() => {
    if (ratings.length === 0) return { average: 0, total: 0, distribution: [0, 0, 0, 0, 0] };

    const total = ratings.length;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    const average = sum / total;

    const distribution = [0, 0, 0, 0, 0];
    ratings.forEach((r) => {
      const index = Math.max(0, Math.min(4, Math.floor(r.rating) - 1));
      distribution[index]++;
    });

    return { average, total, distribution: distribution.reverse() };
  }, [ratings]);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Calificación Promedio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-4xl font-bold">{stats.average.toFixed(1)}</span>
            <Star className="h-8 w-8 text-yellow-400 fill-yellow-400" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Basado en {stats.total} valoraciones</p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Distribución de Estrellas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stats.distribution.map((count, i) => {
            const stars = 5 - i;
            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
            return (
              <div key={stars} className="flex items-center gap-2 text-sm">
                <span className="w-12">{stars} {stars === 1 ? 'est.' : 'est.'}</span>
                <Progress value={percentage} className="h-2" />
                <span className="w-8 text-right">{count}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
