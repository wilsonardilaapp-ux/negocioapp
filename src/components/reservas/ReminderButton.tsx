'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { WhatsAppIcon } from '@/components/icons';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sendBookingNotification } from '@/services/booking-notifications';
import { useFirestore } from '@/firebase/provider';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc } from 'firebase/firestore';
import type { Reservation } from '@/models/booking';

/**
 * @fileOverview Botón de acción rápida para enviar recordatorios de cita vía WhatsApp.
 */
export function ReminderButton({ reservation, businessId }: { reservation: Reservation; businessId: string }) {
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const handleSend = async () => {
    setIsSending(true);
    try {
      // Invocamos el servicio de notificaciones (Server Action)
      await sendBookingNotification('onReminder', businessId, reservation);
      
      // Registramos la marca de tiempo de envío de forma no bloqueante
      const resRef = doc(firestore, `businesses/${businessId}/reservations`, reservation.id);
      await updateDocumentNonBlocking(resRef, { 
        reminderSentAt: new Date().toISOString() 
      });
      
      toast({ 
        title: 'Recordatorio enviado', 
        description: `Se ha notificado a ${reservation.customerName} vía WhatsApp.` 
      });
    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Error al enviar', 
        description: 'No se pudo contactar al servicio de mensajería.' 
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleSend} 
      disabled={isSending}
      className="gap-2 border-green-200 text-green-700 hover:bg-green-50 h-9 font-bold"
    >
      {isSending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <WhatsAppIcon className="h-3.5 w-3.5" />
      )}
      Enviar Recordatorio
    </Button>
  );
}
