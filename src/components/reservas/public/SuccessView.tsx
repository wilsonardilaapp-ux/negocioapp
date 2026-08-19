'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Calendar, 
  Clock, 
  User, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { WhatsAppIcon } from '@/components/icons';
import type { Reservation } from '@/models/booking';

interface SuccessViewProps {
  reservation: Reservation | null;
  businessName?: string;
}

/**
 * Formatea una fecha de forma segura evitando desfases de zona horaria (UTC vs Local).
 */
const formatDateSafe = (dateVal: any): string => {
  try {
    if (!dateVal) return "";
    // Aseguramos que el string de fecha (YYYY-MM-DD) se interprete como medianoche local
    const d = typeof dateVal === 'string'
      ? new Date(dateVal.includes('T') ? dateVal : `${dateVal}T00:00:00`)
      : new Date(dateVal);
    
    if (isNaN(d.getTime())) return String(dateVal);
    
    return format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  } catch (error) {
    console.error("[formatDateSafe] Error:", error);
    return String(dateVal || "");
  }
};

export function SuccessView({ reservation, businessName }: SuccessViewProps) {
  
  const handleAddToCalendar = () => {
    if (!reservation) return;
    const title = `Cita: ${reservation.serviceId} en ${businessName || 'Negocio'}`;
    const details = `Cita agendada vía Markix. Profesional: ${reservation.staffName || 'Asignación automática'}`;
    const dateStr = reservation.date.replace(/-/g, '');
    const startStr = reservation.startTime.replace(/:/g, '');
    const endStr = reservation.endTime?.replace(/:/g, '') || startStr;
    
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(details)}&dates=${dateStr}T${startStr}00/${dateStr}T${endStr}00`;
    window.open(url, '_blank');
  };

  const handleNotifyWhatsApp = () => {
    if (!reservation) return;
    const msg = `¡Hola! 👋 Confirmo mi cita para el ${reservation.date} a las ${reservation.startTime}. Nombre: ${reservation.customerName}.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in zoom-in duration-500">
      <Card className="bg-white rounded-[2rem] border-none shadow-2xl overflow-hidden">
        <div className="bg-primary/5 p-10 text-center space-y-4 border-b">
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-[2rem] shadow-xl border-4 border-white ring-1 ring-primary/20">
              <CheckCircle2 className="h-16 w-16 text-primary fill-primary/10" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">¡Cita Agendada!</h2>
            <p className="text-sm font-bold text-primary uppercase tracking-widest">Reserva Confirmada con Éxito</p>
          </div>
        </div>

        <CardContent className="p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Servicio</span>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-xl"><CheckCircle2 className="h-4 w-4 text-primary" /></div>
                  <p className="font-bold text-gray-900">{reservation?.serviceName || reservation?.serviceId}</p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Profesional</span>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-xl"><User className="h-4 w-4 text-primary" /></div>
                  <p className="font-bold text-gray-900">{reservation?.staffName || 'Cualquier Profesional'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Fecha del Turno</span>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-xl"><Calendar className="h-4 w-4 text-primary" /></div>
                  <p className="font-bold text-gray-900 capitalize">{formatDateSafe(reservation?.date)}</p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Hora</span>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-xl"><Clock className="h-4 w-4 text-primary" /></div>
                  <p className="font-bold text-gray-900">{reservation?.startTime}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-muted/30 rounded-3xl border-2 border-dashed border-muted flex flex-col items-center gap-4 text-center">
             <div className="p-2 bg-white rounded-full shadow-sm">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
             </div>
             <p className="text-sm text-gray-600 leading-relaxed max-w-xs font-medium">
               Tu reserva ha sido registrada en nuestro sistema. Te esperamos puntualmente.
             </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <Button 
               variant="outline" 
               className="h-14 rounded-2xl font-bold border-2 hover:bg-primary/5 transition-all"
               onClick={handleAddToCalendar}
             >
                <Calendar className="mr-2 h-5 w-5 text-primary" />
                Agendar en Google
             </Button>
             <Button 
               className="h-14 rounded-2xl font-black shadow-lg shadow-primary/10 transition-transform active:scale-95"
               onClick={handleNotifyWhatsApp}
             >
                <WhatsAppIcon className="mr-2 h-5 w-5" />
                Enviar a WhatsApp
             </Button>
          </div>
        </CardContent>
        
        <div className="bg-muted/10 p-6 text-center border-t">
           <Button variant="link" className="text-xs font-bold text-muted-foreground uppercase tracking-widest" onClick={() => window.location.reload()}>
             Realizar otra reserva <ChevronRight className="ml-1 h-3 w-3" />
           </Button>
        </div>
      </Card>
    </div>
  );
}
