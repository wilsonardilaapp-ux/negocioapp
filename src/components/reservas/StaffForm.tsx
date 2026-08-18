'use client';

import { useState, useTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Loader2, Save, User, Briefcase, Phone, Tag } from 'lucide-react';
import type { BookingStaff, BookingService } from '@/models/booking';
import { cn } from '@/lib/utils';
import Link from 'next/link';

/**
 * @fileOverview Formulario de gestión para profesionales de servicios.
 */

const staffSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  specialty: z.string().optional(),
  phone: z.string().optional(),
  assignedServiceIds: z.array(z.string()).min(1, "Selecciona al menos un servicio."),
  isActive: z.boolean().default(true),
});

type StaffFormData = z.infer<typeof staffSchema>;

interface StaffFormProps {
  existingStaff: BookingStaff | null;
  services: BookingService[];
  onSave: (data: Omit<BookingStaff, 'id'>) => Promise<void>;
  onClose: () => void;
}

export function StaffForm({ existingStaff, services, onSave, onClose }: StaffFormProps) {
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, control, formState: { errors } } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: existingStaff?.name || '',
      specialty: existingStaff?.specialty || '',
      phone: existingStaff?.phone || '',
      assignedServiceIds: existingStaff?.assignedServiceIds || [],
      isActive: existingStaff?.isActive ?? true,
    }
  });

  const onSubmit = (data: StaffFormData) => {
    startTransition(async () => {
      await onSave({
        ...data,
        createdAt: existingStaff?.createdAt || new Date().toISOString()
      });
    });
  };

  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
        <div className="p-4 bg-muted rounded-full">
          <Tag className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold">No hay servicios creados</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Debes tener al menos un servicio registrado antes de añadir profesionales.
          </p>
        </div>
        <Button asChild className="font-bold">
          <Link href="/dashboard/reservas/servicios">Ir a Crear Servicios</Link>
        </Button>
        <Button variant="ghost" onClick={onClose} className="mt-2">Cerrar</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Nombre Completo *
          </Label>
          <Input id="name" {...register('name')} placeholder="Ej: Dr. Juan Pérez, Ana Barber..." className="bg-muted/20" />
          {errors.name && <p className="text-xs text-destructive font-medium">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="specialty" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> Especialidad
            </Label>
            <Input id="specialty" {...register('specialty')} placeholder="Ej: Colorista, Dermatólogo..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" /> Teléfono
            </Label>
            <Input id="phone" {...register('phone')} placeholder="WhatsApp de contacto" />
          </div>
        </div>

        <div className="space-y-3">
          <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Servicios que realiza *</Label>
          <Card className="bg-muted/10 border-gray-100 overflow-hidden shadow-inner">
            <ScrollArea className="h-48 p-4">
              <div className="space-y-3">
                {services.map((service) => (
                  <div key={service.id} className="flex items-center space-x-3 group">
                    <Controller
                      name="assignedServiceIds"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id={`service-${service.id}`}
                          checked={field.value.includes(service.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              field.onChange([...field.value, service.id]);
                            } else {
                              field.onChange(field.value.filter(id => id !== service.id));
                            }
                          }}
                        />
                      )}
                    />
                    <label 
                      htmlFor={`service-${service.id}`} 
                      className="text-sm font-medium leading-none cursor-pointer flex-1 group-hover:text-primary transition-colors"
                    >
                      {service.name}
                    </label>
                    <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-tighter h-5">
                      {service.durationMinutes} min
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
          {errors.assignedServiceIds && <p className="text-xs text-destructive font-medium">{errors.assignedServiceIds.message}</p>}
        </div>
      </div>

      <DialogFooter className="bg-muted/20 -mx-6 -mb-6 p-6 border-t">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>Cancelar</Button>
        <Button type="submit" disabled={isPending} className="font-black px-8">
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {existingStaff ? 'Guardar Cambios' : 'Crear Profesional'}
        </Button>
      </DialogFooter>
    </form>
  );
}
