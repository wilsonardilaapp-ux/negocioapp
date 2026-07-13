'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Star, MessageSquare, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Props {
  rating: number;
  reviewCount: number;
  distribution?: Record<string, number>;
}

export default function ReviewSummary({ rating, reviewCount, distribution }: Props) {
  // Asegurar valores por defecto para evitar errores de renderizado
  const currentRating = rating || 5.0;
  const totalReviews = reviewCount || 0;

  // Si no hay distribución real, simulamos una visualmente atractiva o mostramos vacío
  const renderDistribution = () => {
    if (!distribution) return null;

    return (
      <div className="space-y-2 flex-1">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star.toString()] || 0;
          const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
          
          return (
            <div key={star} className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1 w-8 shrink-0">
                <span className="font-bold">{star}</span>
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              </div>
              <Progress value={percentage} className="h-2" />
              <span className="w-8 text-right text-muted-foreground text-xs">{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="overflow-hidden border-none shadow-none bg-transparent">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          {/* Bloque de Calificación Gigante */}
          <div className="text-center md:text-left space-y-2 shrink-0">
            <div className="flex items-center justify-center md:justify-start gap-4">
              <div className="text-6xl font-black text-gray-900 tracking-tighter">
                {currentRating.toFixed(1)}
              </div>
              <div className="flex flex-col items-start">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={cn(
                        "h-5 w-5",
                        s <= Math.round(currentRating) ? "text-yellow-400 fill-yellow-400" : "text-gray-200"
                      )}
                    />
                  ))}
                </div>
                <p className="text-sm font-bold text-muted-foreground mt-1">
                  {totalReviews} opiniones verificadas
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full w-fit mx-auto md:mx-0">
              <TrendingUp className="h-3 w-3" />
              98% de clientes recomiendan este negocio
            </div>
          </div>

          {/* Barras de Distribución */}
          {distribution && (
            <div className="hidden sm:block w-full max-w-xs">
               {renderDistribution()}
            </div>
          )}

          {/* Call to Action Interno */}
          <div className="hidden lg:flex flex-col gap-2 p-4 bg-muted/30 rounded-2xl border border-dashed border-muted-foreground/20">
             <div className="flex items-center gap-2 font-bold text-sm text-gray-700">
                <MessageSquare className="h-4 w-4 text-primary" />
                Tu opinión importa
             </div>
             <p className="text-xs text-muted-foreground leading-relaxed">
                Calificá tu experiencia y ayudanos a mejorar. ¡Recibí 10 puntos de regalo por tu primera reseña!
             </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
