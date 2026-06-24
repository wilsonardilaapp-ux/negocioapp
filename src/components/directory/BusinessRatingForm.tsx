'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Star, Loader2, Send, CheckCircle2, MessageSquare } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { submitBusinessRating } from '@/actions/directory-ratings';
import { cn } from '@/lib/utils';

const ratingSchema = z.object({
  rating: z.number().min(1, 'Por favor, selecciona una calificación.').max(5),
  comment: z.string().min(10, 'Tu comentario debe tener al menos 10 caracteres.'),
});

type RatingFormData = z.infer<typeof ratingSchema>;

interface BusinessRatingFormProps {
  businessId: string;
  businessName: string;
}

export function BusinessRatingForm({ businessId, businessName }: BusinessRatingFormProps) {
  const { user, profile } = useUser();
  const { toast } = useToast();
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastStatus, setLastStatus] = useState('');

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<RatingFormData>({
    resolver: zodResolver(ratingSchema),
    defaultValues: {
      rating: 0,
      comment: '',
    },
  });

  const currentRating = watch('rating');

  const onSubmit = async (data: RatingFormData) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Acceso requerido', description: 'Debes iniciar sesión para calificar.' });
      return;
    }

    const result = await submitBusinessRating({
      businessId,
      businessName,
      userId: user.uid,
      userName: profile?.name || user.email?.split('@')[0] || 'Usuario',
      rating: data.rating,
      comment: data.comment,
    });

    if (result.success) {
      setIsSuccess(true);
      setLastStatus(result.status || '');
      reset();
      toast({ title: '¡Gracias!', description: result.status === 'published' ? 'Tu valoración ha sido publicada.' : 'Tu valoración ha sido recibida y está pendiente de revisión.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar la valoración.' });
    }
  };

  if (isSuccess) {
    return (
      <Card className="border-green-100 bg-green-50/30">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-green-900">¡Valoración enviada!</h3>
            <p className="text-sm text-green-700">
              {lastStatus === 'published' 
                ? 'Gracias por compartir tu experiencia con la comunidad.' 
                : 'Tu reseña ha sido guardada. Debido a nuestra política de calidad, las calificaciones de 1-3 estrellas son revisadas por moderadores antes de ser públicas.'}
            </p>
          </div>
          <Button variant="outline" className="border-green-200 text-green-700 hover:bg-green-100" onClick={() => setIsSuccess(false)}>
            Escribir otra reseña
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="review-form">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Deja tu opinión
        </CardTitle>
        <CardDescription>Tu experiencia ayuda a otros usuarios a elegir mejor.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="space-y-2 text-center sm:text-left">
            <Label className="text-base">¿Qué te pareció el servicio?</Label>
            <div className="flex items-center justify-center sm:justify-start gap-1 pt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="transition-transform hover:scale-110 focus:outline-none"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setValue('rating', star)}
                >
                  <Star
                    className={cn(
                      "h-8 w-8 transition-colors",
                      (hoveredRating || currentRating) >= star 
                        ? "text-yellow-400 fill-yellow-400" 
                        : "text-gray-200"
                    )}
                  />
                </button>
              ))}
            </div>
            {errors.rating && <p className="text-xs text-destructive font-medium">{errors.rating.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Tu comentario</Label>
            <Textarea
              id="comment"
              placeholder="Cuéntanos más detalles sobre tu experiencia..."
              className="min-h-[100px] resize-none"
              {...register('comment')}
            />
            {errors.comment && <p className="text-xs text-destructive font-medium">{errors.comment.message}</p>}
          </div>
        </CardContent>
        <CardFooter>
          {!user ? (
            <div className="w-full p-4 bg-muted/50 rounded-lg text-center space-y-3">
              <p className="text-sm text-muted-foreground">Debes estar registrado para calificar este negocio.</p>
              <Button asChild variant="outline" className="w-full">
                <a href="/login">Iniciar Sesión</a>
              </Button>
            </div>
          ) : (
            <Button type="submit" className="w-full font-bold" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</>
              ) : (
                <><Send className="mr-2 h-4 w-4" /> Enviar Valoración</>
              )}
            </Button>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
