'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Ban, Loader2, AlertTriangle } from 'lucide-react';
import { cancelReservation } from '@/actions/booking-management';
import { useToast } from '@/hooks/use-toast';

interface CancelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reservationId: string;
  businessId: string;
}

export function CancelDialog({ isOpen, onClose, reservationId, businessId }: CancelDialogProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState('Cliente solicitó cancelación');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCancel = async () => {
    setIsSubmitting(true);
    const fullReason = `${reason}${notes ? ` - ${notes}` : ''}`;
    const result = await cancelReservation(businessId, reservationId, fullReason);
    
    if (result.success) {
      toast({ title: 'Cita cancelada', description: 'El turno ha sido liberado en la agenda.' });
      onClose();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black flex items-center gap-2 text-orange-600">
            <Ban className="h-5 w-5" /> Cancelar Reservación
          </DialogTitle>
          <DialogDescription>
            Indica el motivo de la cancelación. Esto liberará el horario de forma inmediata.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Motivo Principal</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cliente solicitó cancelación">Cliente solicitó cancelación</SelectItem>
                <SelectItem value="Imprevisto del negocio">Imprevisto del negocio</SelectItem>
                <SelectItem value="Personal no disponible">Personal no disponible</SelectItem>
                <SelectItem value="Error en la reserva">Error en la reserva</SelectItem>
                <SelectItem value="Otro">Otro motivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Detalles adicionales</Label>
            <Textarea 
              placeholder="Escribe brevemente por qué se cancela..." 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-24 resize-none bg-muted/20"
            />
          </div>

          <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
             <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
             <p className="text-[10px] text-orange-800 leading-tight">
               Al cancelar, el profesional quedará libre en este horario para recibir nuevas citas desde la web o el panel.
             </p>
          </div>
        </div>

        <DialogFooter className="bg-muted/30 -mx-6 -mb-6 p-4 border-t">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Volver</Button>
          <Button 
            variant="destructive" 
            className="font-black" 
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirmar Cancelación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
