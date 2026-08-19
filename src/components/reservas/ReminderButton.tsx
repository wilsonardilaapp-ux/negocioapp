'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { WhatsAppIcon } from '@/components/icons';
import { Loader2, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sendBookingNotification } from '@/services/booking-notifications';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc } from 'firebase/firestore';
import type { Reservation } from '@/models/booking';
import type { Business } from '@/models/business';
import { normalizePhoneNumber } from '@/lib/utils';

/**
 * @fileOverview Botón de acción rápida para enviar recordatorios de cita vía WhatsApp.
 * Soporta envío automático por API y envío manual directo (wa.me).
 */
export function ReminderButton({ reservation, businessId }: { reservation: Reservation; businessId: string }) {
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  // Obtener datos del negocio para el mensaje manual
  const businessRef = useMemoFirebase(() => 
    businessId ? doc(firestore, 'businesses', businessId) : null,
    [firestore, businessId]
  );
  const { data: business } = useDoc<Business>(businessRef);

  // --- FLUJO AUTOMÁTICO (API PREMIUM) ---
  const handleSend = async () => {
    setIsSending(true);
    try {
      // Invocamos el servicio de notificaciones (Server Action)
      await sendBookingNotification('onReminder', businessId, reservation);
      
      // Registramos la marca de tiempo de envío de forma no bloqueante
      const resRef = doc(firestore, `businesses/${businessId}/reservations`, reservation.id);
      await updateDocumentNonBlocking(resRef, { 
        reminderSentAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      toast({ 
        title: 'Recordatorio enviado', 
        description: `Se ha notificado a ${reservation.customerName} vía WhatsApp (Auto).` 
      });
    } catch (error) {
      toast({ 
        variant: 'destructive', 
        title: 'Error al enviar', 
        description: 'No se pudo contactar al servicio de mensajería automática.' 
      });
    } finally {
      setIsSending(false);
    }
  };

  // --- FLUJO MANUAL (WA.ME GRATUITO) ---
  const handleManualSend = async () => {
    const rawPhone = reservation.customerPhone;
    if (!rawPhone) {
      toast({ variant: "destructive", title: "Error", description: "El cliente no tiene teléfono registrado." });
      return;
    }

    const phone = normalizePhoneNumber(rawPhone);
    const dateFormatted = reservation.date || "";
    const timeFormatted = reservation.startTime || "";
    const service = reservation.serviceName || "tu cita";
    const businessNameLocal = business?.name || "nuestro local";
    const client = reservation.customerName || "Cliente";

    const messageText = `¡Hola ${client}! 👋 Te recordamos tu cita de ${service} el ${dateFormatted} a las ${timeFormatted} en ${businessNameLocal}. ¡Te esperamos!`;
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(messageText)}`;

    // Abrir WhatsApp en pestaña nueva
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");

    // Registrar en Firestore sin bloquear el hilo UI
    try {
      if (firestore && businessId && reservation.id) {
        const resRef = doc(firestore, `businesses/${businessId}/reservations`, reservation.id);
        await updateDocumentNonBlocking(resRef, { 
          reminderSentManualAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.warn("Aviso al guardar tracking de recordatorio manual:", err);
    }
  };

  return (
    <div className="flex gap-1.5 flex-1">
      {/* Botón Automático (Premium) */}
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleSend} 
        disabled={isSending}
        className="gap-1.5 border-green-200 text-green-700 hover:bg-green-50 h-9 font-bold flex-1 px-2"
        title="Recordatorio Automático (API)"
      >
        {isSending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <WhatsAppIcon className="h-3.5 w-3.5" />
        )}
        <span className="text-[10px] uppercase">Auto</span>
      </Button>

      {/* Botón Manual (Gratis) */}
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleManualSend} 
        disabled={isSending}
        className="gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 h-9 font-bold flex-1 px-2"
        title="Recordatorio Manual (wa.me)"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        <span className="text-[10px] uppercase">Manual</span>
      </Button>
    </div>
  );
}
