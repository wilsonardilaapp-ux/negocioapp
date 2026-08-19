'use client';

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    CheckCircle2, 
    Calendar, 
    Clock, 
    User, 
    MessageSquare, 
    Smartphone,
    Share2,
    ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Reservation } from '@/models/booking';
import { normalizePhoneNumber } from '@/lib/utils';
import { WhatsAppIcon } from '@/components/icons';

interface SuccessViewProps {
  reservation: Reservation;
}

export function SuccessView({ reservation }: SuccessViewProps) {
  const handleAddToCalendar = () => {
    const start = reservation.date.replace(/-/g, '') + 'T' + reservation.startTime.replace(/:/g, '') + '00';
    const end = reservation.date.replace(/-/g, '') + 'T' + reservation.endTime.replace(/:/g, '') + '00';
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(reservation.serviceName || reservation.serviceId)}&dates=${start}/${end}&details=${encodeURIComponent('Reserva confirmada vía Markix')}&location=&sf=true&output=xml`;
    window.open(url, '_blank');
  };

  const handleWhatsAppNotify = () => {
    const message = `¡Hola! 👋 He confirmado mi reserva para *${reservation.serviceName || reservation.serviceId}* el día *${reservation.date}* a las *${reservation.startTime}*. Mi nombre es ${reservation.customerName}.`;
    window.open(`https://wa.me/${normalizePhoneNumber(reservation.customerPhone)}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const formatDateSafe = (dateVal: any): string => {
    try {
      if (!dateVal) return "";
      const d = typeof dateVal === 'string'
        ? new Date(dateVal.includes('T') ? dateVal : `${dateVal}T00:00:00`)
        : new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
    } catch {
      return String(dateVal || "");
    }
  };

  return (
    <div className="max-w-md mx-auto animate-in zoom-in duration-500">
      <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white">
        <CardHeader className="bg-primary pt-12 pb-20 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <CheckCircle2 className="w-64 h-64 -ml-10 -mt-10 rotate-12" />
            </div>
            <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="bg-white rounded-full p-4 shadow-xl">
                    <CheckCircle2 className="w-12 h-12 text-primary fill-primary/10" />
                </div>
                <div className="space-y-1">
                    <CardTitle className="text-white text-3xl font-black tracking-tight">¡Cita Agendada!</CardTitle>
                    <p className="text-primary-foreground/80 font-medium text-sm">Tu espacio ha sido reservado con éxito.</p>
                </div>
            </div>
        </CardHeader>
        
        <CardContent className="px-8 -mt-10 relative z-20">
           <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 space-y-6">
              <div className="space-y-4">
                 <div className="flex flex-col items-center gap-1 border-b pb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fecha de la cita</span>
                    <p className="font-bold text-gray-900 text-center leading-tight">
                        {formatDateSafe(reservation?.date)}
                    </p>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center gap-1 bg-muted/30 p-3 rounded-2xl border border-dashed">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-black uppercase text-muted-foreground">Hora</span>
                        <p className="font-black text-lg">{reservation?.startTime}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 bg-muted/30 p-3 rounded-2xl border border-dashed">
                        <User className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-black uppercase text-muted-foreground">Staff</span>
                        <p className="font-bold text-sm text-center line-clamp-1">{reservation?.staffName || 'Asignado'}</p>
                    </div>
                 </div>
              </div>

              <div className="space-y-3 pt-2">
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">Servicio:</span>
                    <span className="font-bold text-gray-900">{reservation?.serviceName || reservation?.serviceId}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">Valor:</span>
                    <span className="font-black text-primary text-lg">${reservation?.price?.toLocaleString('es-CO')}</span>
                 </div>
              </div>
           </div>

           <div className="mt-8 space-y-3">
              <Button onClick={handleAddToCalendar} variant="outline" className="w-full h-12 font-bold rounded-2xl border-gray-200">
                <Calendar className="mr-2 h-4 w-4" /> Agregar a mi Calendario
              </Button>
              <Button onClick={handleWhatsAppNotify} variant="outline" className="w-full h-12 font-bold rounded-2xl border-green-200 text-green-700 bg-green-50 hover:bg-green-100">
                <WhatsAppIcon className="mr-2 h-4 w-4" /> Notificar por WhatsApp
              </Button>
           </div>
        </CardContent>

        <CardFooter className="p-8 pt-4 flex flex-col gap-4">
           <Button asChild className="w-full h-14 text-lg font-black rounded-2xl shadow-lg shadow-primary/20">
              <a href="/">
                Volver al inicio <ArrowRight className="ml-2 h-5 w-5" />
              </a>
           </Button>
           <p className="text-[10px] text-center text-muted-foreground font-bold uppercase tracking-widest">
             Gracias por confiar en nosotros
           </p>
        </CardFooter>
      </Card>
    </div>
  );
}
