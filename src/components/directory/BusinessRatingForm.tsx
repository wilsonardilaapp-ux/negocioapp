'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Star, Loader2, Send, CheckCircle2, MessageSquare, User, Smartphone, Mail } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { submitBusinessRating } from '@/actions/directory-ratings';
import { cn } from '@/lib/utils';

const ratingSchema = z.object({
  rating: z.number().min(1, 'Por favor, selecciona una calificación.').max(5),
  comment: z.string().min(10, 'Tu comentario debe tener al menos 10 caracteres.'),
  // Campos para invitados
  guestName: z.string().optional(),
  guestPhone: z.string().optional(),
  guestEmail: z.string().optional(),
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
      guestName: '',
      guestPhone: '',
      guestEmail: '',
    },
  });

  const currentRating = watch('rating');

  const onSubmit = async (data: RatingFormData) => {
    // Validación manual para invitados si no hay usuario
    if (!user) {
        if (!data.guestName || data.guestName.trim().length < 3) {
            toast({ variant: 'destructive', title: 'Nombre requerido', description: 'Por favor ingresa tu nombre completo.' });
            return;
        }
        const phoneDigits = data.guestPhone?.replace(/\D/g, '') || '';
        if (phoneDigits.length < 10) {
            toast({ variant: 'destructive', title: 'WhatsApp requerido', description: 'Ingresa un número de WhatsApp válido (mínimo 10 dígitos).' });
            return;
        }
    }

    const result = await submitBusinessRating({
      businessId,
      businessName,
      rating: data.rating,
      comment: data.comment,
      // Si hay usuario, enviamos sus datos
      ...(user ? {
          userId: user.uid,
          userName: profile?.name || user.email?.split('@')[0] || 'Usuario',
          authType: 'registered'
      } : {
          // Si no hay usuario, enviamos datos de invitado
          guestName: data.guestName,
          guestPhone: data.guestPhone,
          guestEmail: data.guestEmail,
          authType: 'guest'
      })
    });

    if (result.success) {
      setIsSuccess(true);
      setLastStatus(result.status || '');
      reset();
      toast({ 
        title: '¡Gracias!', 
        description: result.status === 'published' 
          ? 'Tu valoración ha sido publicada.' 
          : 'Tu valoración ha sido recibida y está pendiente de revisión.' 
      });
    } else {
      toast({ 
        variant: 'destructive', 
        title: 'Error al enviar', 
        description: result.error || 'No se pudo procesar tu valoración en este momento.' 
      });
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
                : 'Tu reseña ha sido guardada. Para garantizar la veracidad del directorio, las reseñas de invitados son verificadas por el administrador antes de ser públicas.'}
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
          
          {/* Datos de Contacto (Solo si no está logueado) */}
          {!user && (
            <div className="space-y-4 p-4 bg-muted/30 rounded-xl border border-dashed animate-in fade-in duration-500">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Datos de contacto para invitado</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="guestName" className="text-xs font-bold flex items-center gap-2">
                            <User className="h-3 w-3" /> Nombre Completo *
                        </Label>
                        <Input 
                            id="guestName" 
                            placeholder="Tu nombre..." 
                            {...register('guestName')}
                            className="bg-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="guestPhone" className="text-xs font-bold flex items-center gap-2">
                            <Smartphone className="h-3 w-3" /> WhatsApp *
                        </Label>
                        <Input 
                            id="guestPhone" 
                            type="tel"
                            placeholder="300 123 4567..." 
                            {...register('guestPhone')}
                            className="bg-white"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="guestEmail" className="text-xs font-bold flex items-center gap-2">
                        <Mail className="h-3 w-3" /> Correo Electrónico (Opcional)
                    </Label>
                    <Input 
                        id="guestEmail" 
                        type="email"
                        placeholder="tu@correo.com" 
                        {...register('guestEmail')}
                        className="bg-white"
                    />
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                    * Estos datos no serán públicos. Se usan solo para validación y moderación de spam.
                </p>
            </div>
          )}

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
          <Button type="submit" className="w-full font-bold" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</>
            ) : (
              <><Send className="mr-2 h-4 w-4" /> Enviar Valoración</>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}