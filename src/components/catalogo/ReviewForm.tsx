'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { normalizePhoneNumber } from '@/lib/utils';
import { createReview } from '@/actions/reviews';
import { StarRatingInput } from './star-rating-input';
import { Loader2, CheckCircle2, MessageSquare, Smartphone, User } from 'lucide-react';

const reviewSchema = z.object({
  name: z.string().min(2, 'Por favor, ingresa tu nombre.'),
  whatsapp: z.string().min(10, 'WhatsApp inválido (ej: 3001234567).'),
  rating: z.number().min(1, 'Selecciona una calificación.').max(5),
  comment: z.string().min(10, 'Tu comentario debe tener al menos 10 caracteres.'),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  businessId: string;
}

export default function ReviewForm({ businessId }: ReviewFormProps) {
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);
  
  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      name: '',
      whatsapp: '',
      comment: '',
    }
  });

  const currentRating = watch('rating');

  const onSubmit = async (data: ReviewFormData) => {
    const result = await createReview({
      businessId,
      name: data.name,
      rating: data.rating,
      comment: data.comment,
      whatsapp: normalizePhoneNumber(data.whatsapp),
    });

    if (result.success) {
      setIsSuccess(true);
      toast({
        title: '¡Gracias!',
        description: 'Tu opinión es muy valiosa para nosotros.',
      });
      reset();
    } else {
      toast({
        variant: 'destructive',
        title: 'Error al enviar',
        description: result.error || 'Ocurrió un problema. Inténtalo de nuevo.',
      });
    }
  };

  if (isSuccess) {
    return (
      <Card className="border-green-100 bg-green-50/50 shadow-sm animate-in fade-in zoom-in duration-300">
        <CardContent className="pt-8 text-center space-y-4">
          <div className="flex justify-center">
            <CheckCircle2 className="h-14 w-14 text-green-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-green-900">¡Reseña recibida!</h3>
            <p className="text-sm text-green-700">Tu comentario ayuda a nuestra comunidad.</p>
          </div>
          <Button variant="outline" className="mt-4 border-green-200 text-green-700 hover:bg-green-100" onClick={() => setIsSuccess(false)}>
            Escribir otra reseña
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-gray-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-800">
            <MessageSquare className="h-5 w-5 text-primary" />
            Deja tu reseña
        </CardTitle>
        <CardDescription>Califica tu experiencia y gana puntos de fidelización.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="space-y-3 text-center sm:text-left">
            <Label className="text-base font-bold">¿Qué te pareció el servicio?</Label>
            <div className="flex justify-center sm:justify-start py-1">
                <StarRatingInput 
                    value={currentRating} 
                    onSelect={(val) => setValue('rating', val, { shouldValidate: true })}
                    readOnly={isSubmitting}
                />
            </div>
            {errors.rating && <p className="text-xs text-destructive font-bold">{errors.rating.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-bold flex items-center gap-1.5 uppercase text-muted-foreground">
                <User className="h-3 w-3" /> Tu Nombre
              </Label>
              <Input id="name" {...register('name')} placeholder="Juan Pérez" disabled={isSubmitting} className="bg-muted/30" />
              {errors.name && <p className="text-xs text-destructive font-bold">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="text-xs font-bold flex items-center gap-1.5 uppercase text-muted-foreground">
                <Smartphone className="h-3 w-3" /> WhatsApp
              </Label>
              <Input id="whatsapp" {...register('whatsapp')} placeholder="300 123 4567" disabled={isSubmitting} className="bg-muted/30" />
              {errors.whatsapp && <p className="text-xs text-destructive font-bold">{errors.whatsapp.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment" className="text-xs font-bold uppercase text-muted-foreground">Tu Comentario</Label>
            <Textarea 
              id="comment" 
              {...register('comment')} 
              placeholder="Cuéntanos más detalles..." 
              className="min-h-[120px] resize-none bg-muted/30" 
              disabled={isSubmitting} 
            />
            {errors.comment && <p className="text-xs text-destructive font-bold">{errors.comment.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="bg-muted/10 border-t pt-6">
          <Button type="submit" className="w-full h-12 text-lg font-black shadow-lg shadow-primary/10" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-5 v-5 animate-spin" /> : 'Publicar Reseña'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
