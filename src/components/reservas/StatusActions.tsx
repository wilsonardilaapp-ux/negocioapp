'use client';

import React, { useState } from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  MoreHorizontal, 
  CheckCircle2, 
  XCircle, 
  CalendarClock, 
  Ban, 
  Trash2,
  Clock,
  UserCheck,
  Bell,
  Loader2
} from 'lucide-react';
import type { Reservation, ReservationStatus } from '@/models/booking';
import { updateReservationStatus } from '@/actions/booking-management';
import { CancelDialog } from './CancelDialog';
import { RescheduleModal } from './RescheduleModal';
import { ReminderButton } from './ReminderButton';
import { useToast } from '@/hooks/use-toast';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';

interface StatusActionsProps {
  reservation: Reservation;
  businessId: string;
}

export function StatusActions({ reservation, businessId }: StatusActionsProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async (status: ReservationStatus) => {
    setIsUpdating(true);
    const result = await updateReservationStatus(businessId, reservation.id, status);
    if (result.success) {
      toast({ title: 'Estado actualizado' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setIsUpdating(false);
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar registro? Esta acción no se puede deshacer.')) return;
    try {
      const resRef = doc(firestore, `businesses/${businessId}/reservations`, reservation.id);
      await deleteDocumentNonBlocking(resRef);
      toast({ title: 'Reserva eliminada' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error al eliminar' });
    }
  };

  return (
    <>
      <div className="flex gap-2 w-full">
        <ReminderButton reservation={reservation} businessId={businessId} />
        
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="font-bold h-9" disabled={isUpdating}>
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
            </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-[10px] uppercase font-black text-muted-foreground">Estatus Operativo</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleUpdate('confirmed')} className="gap-2 text-blue-600 font-bold">
                <UserCheck className="h-4 w-4" /> Confirmar Cita
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleUpdate('completed')} className="gap-2 text-green-600 font-bold">
                <CheckCircle2 className="h-4 w-4" /> Marcar Completada
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleUpdate('no_show')} className="gap-2 text-gray-500 font-bold">
                <Clock className="h-4 w-4" /> Marcar No Asistió
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuLabel className="text-[10px] uppercase font-black text-muted-foreground">Gestión</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setIsRescheduleOpen(true)} className="gap-2 font-bold">
                <CalendarClock className="h-4 w-4" /> Reprogramar Turno
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsCancelOpen(true)} className="gap-2 text-orange-600 font-bold">
                <Ban className="h-4 w-4" /> Cancelar Cita
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={handleDelete} className="gap-2 text-destructive">
                <Trash2 className="h-4 w-4" /> Eliminar Registro
            </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CancelDialog 
        isOpen={isCancelOpen} 
        onClose={() => setIsCancelOpen(false)} 
        reservationId={reservation.id}
        businessId={businessId}
      />

      <RescheduleModal 
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        reservation={reservation}
        businessId={businessId}
      />
    </>
  );
}
