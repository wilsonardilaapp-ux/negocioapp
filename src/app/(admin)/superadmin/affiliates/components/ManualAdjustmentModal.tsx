
'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser } from '@/firebase';
import { doc, collection, writeBatch, increment, Timestamp } from 'firebase/firestore';
import { Loader2, TrendingUp } from 'lucide-react';
import type { Business } from '@/models/business';
import type { ExtraCapacityLog } from '@/models/extra-capacity-log';

const adjustmentSchema = z.object({
  businessId: z.string().min(1, "Debes seleccionar un negocio."),
  amount: z.number().min(1, "El aumento mínimo es de 1 producto."),
  notes: z.string().min(5, "Debes ingresar un motivo válido (mínimo 5 caracteres)."),
});

type AdjustmentFormData = z.infer<typeof adjustmentSchema>;

interface ManualAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  businesses: Business[];
}

export default function ManualAdjustmentModal({ isOpen, onClose, businesses }: ManualAdjustmentModalProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const { register, handleSubmit, control, reset, watch, formState: { errors, isSubmitting } } = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      amount: 5,
      notes: '',
    }
  });

  const onSubmit = async (data: AdjustmentFormData) => {
    if (!firestore || !user) return;

    const targetBusiness = businesses.find(b => b.id === data.businessId);
    if (!targetBusiness) return;

    try {
      const batch = writeBatch(firestore);
      const now = Timestamp.now();

      // 1. Incrementar en el documento de negocio
      const businessRef = doc(firestore, 'businesses', data.businessId);
      batch.update(businessRef, {
        'limitesExtra.products': increment(data.amount)
      });

      // 2. Crear Log de Auditoría
      const logRef = doc(collection(firestore, 'extraCapacityLogs'));
      const logData: ExtraCapacityLog = {
        businessId: data.businessId,
        businessName: targetBusiness.name,
        amount: data.amount,
        reason: 'ajuste_manual',
        origin: 'manual',
        adminId: user.uid,
        notes: data.notes,
        createdAt: now,
      };
      batch.set(logRef, logData);

      await batch.commit();

      toast({
        title: "Capacidad Otorgada",
        description: `Se han añadido ${data.amount} productos extra a ${targetBusiness.name}.`,
      });
      
      reset();
      onClose();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error en el ajuste",
        description: error.message,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="text-primary h-5 w-5" />
            Ajuste Manual de Capacidad
          </DialogTitle>
          <DialogDescription>
            Otorga capacidad de productos extra permanentemente a un negocio específico.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Seleccionar Negocio</Label>
              <Controller
                name="businessId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Busca un negocio..." />
                    </SelectTrigger>
                    <SelectContent>
                      {businesses.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} ({b.ownerEmail})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.businessId && <p className="text-xs text-destructive font-bold">{errors.businessId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Cantidad de Productos Extra (+)</Label>
              <Input 
                id="amount" 
                type="number" 
                {...register('amount', { valueAsNumber: true })} 
              />
              {errors.amount && <p className="text-xs text-destructive font-bold">{errors.amount.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Motivo del Ajuste (Obligatorio)</Label>
              <Textarea 
                id="notes" 
                placeholder="Ej. Cortesía por soporte técnico, ampliación especial contratada..." 
                {...register('notes')}
              />
              {errors.notes && <p className="text-xs text-destructive font-bold">{errors.notes.message}</p>}
            </div>
          </div>

          <DialogFooter className="bg-muted/30 p-4 -mx-6 -mb-6 border-t">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !watch('notes')} className="font-black">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Aumento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
