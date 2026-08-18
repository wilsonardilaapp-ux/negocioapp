
'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { User, Smartphone, Mail, Send, Loader2, CheckCircle2 } from 'lucide-react';

const schema = z.object({
  customerName: z.string().min(3, 'Tu nombre es requerido.'),
  customerPhone: z.string().min(7, 'Ingresa un WhatsApp válido.'),
  customerEmail: z.string().email('Email no válido.').optional().or(z.literal('')),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onConfirm: (data: FormData) => void;
  isSubmitting: boolean;
}

export function ContactStep({ onConfirm, isSubmitting }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-gray-900">Tus datos de contacto</h2>
        <p className="text-muted-foreground text-sm">Necesitamos tu información para enviarte la confirmación.</p>
      </div>

      <form onSubmit={handleSubmit(onConfirm)} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <User className="h-3 w-3" /> Nombre completo
            </Label>
            <Input {...register('customerName')} placeholder="¿Cómo te llamas?" className="h-12 bg-white rounded-xl" disabled={isSubmitting} />
            {errors.customerName && <p className="text-xs text-destructive font-medium">{errors.customerName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <Smartphone className="h-3 w-3" /> WhatsApp
            </Label>
            <Input {...register('customerPhone')} placeholder="Ej: 300 123 4567" className="h-12 bg-white rounded-xl" disabled={isSubmitting} />
            {errors.customerPhone && <p className="text-xs text-destructive font-medium">{errors.customerPhone.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <Mail className="h-3 w-3" /> Email (opcional)
            </Label>
            <Input {...register('customerEmail')} type="email" placeholder="Para enviarte el recordatorio..." className="h-12 bg-white rounded-xl" disabled={isSubmitting} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">¿Alguna nota especial?</Label>
            <Textarea {...register('notes')} placeholder="Alergias, preferencias o comentarios..." className="bg-white rounded-xl resize-none h-24" disabled={isSubmitting} />
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full h-14 text-lg font-black shadow-xl shadow-primary/20 rounded-2xl"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
          Confirmar Reserva
        </Button>
      </form>
    </div>
  );
}
