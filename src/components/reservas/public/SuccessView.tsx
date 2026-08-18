
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Calendar, Clock, User, Phone, MessageSquare, ArrowRight } from 'lucide-react';
import type { Reservation, BookingService } from '@/models/booking';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { WhatsAppIcon } from '@/components/icons';
import { normalizePhoneNumber } from '@/lib/utils';

interface Props {
  reservation: Reservation;
  service: BookingService;
}

export function SuccessView({ reservation, service }: Props) {
  const formattedDate = format(new Date(reservation.date + 'T00:00:00'), "EEEE, d 'de' MMMM", { locale: es });
  
  const handleWhatsApp = () => {
    const msg = `¡Hola! Acabo de agendar una cita para *${service.name}* a través de su plataforma.\n\n📅 Fecha: ${formattedDate}\n⏰ Hora: ${reservation.startTime}\n👤 Cliente: ${reservation.customerName}\n\n¡Nos vemos pronto!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="max-w-md mx-auto space-y-8 py-10 animate-in zoom-in duration-500">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
            <div className="p-4 bg-green-100 rounded-full animate-bounce">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
        </div>
        <h2 className="text-3xl font-black text-gray-900">¡Reserva confirmada!</h2>
        <p className="text-muted-foreground font-medium">Tu cita ha sido agendada exitosamente en el sistema.</p>
      </div>

      <Card className="border-2 shadow-2xl rounded-3xl overflow-hidden">
        <div className="bg-primary p-4 text-center">
            <span className="text-[10px] font-black text-white/80 uppercase tracking-[0.3em]">Comprobante de Reserva</span>
        </div>
        <CardContent className="p-8 space-y-6">
            <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Servicio</p>
                <p className="text-xl font-black text-gray-900">{service.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Fecha</p>
                    <div className="flex items-center gap-2 font-bold text-gray-800 capitalize">
                        <Calendar className="h-4 w-4 text-primary" /> {formattedDate}
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Hora</p>
                    <div className="flex items-center gap-2 font-bold text-gray-800">
                        <Clock className="h-4 w-4 text-primary" /> {reservation.startTime}
                    </div>
                </div>
            </div>

            <div className="space-y-1 pt-4 border-t border-dashed">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Detalles del cliente</p>
                <p className="font-bold text-gray-800">{reservation.customerName}</p>
                <p className="text-sm text-muted-foreground">{reservation.customerPhone}</p>
            </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button onClick={handleWhatsApp} className="w-full h-14 bg-[#25D366] hover:bg-[#128C7E] font-black text-lg rounded-2xl shadow-lg border-none">
            <WhatsAppIcon className="mr-2 h-5 w-5" /> Enviar por WhatsApp
        </Button>
        <Button variant="outline" className="w-full h-12 font-bold rounded-2xl" onClick={() => window.location.href = '/'}>
            Finalizar y volver al inicio
        </Button>
      </div>

      <p className="text-center text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-40">
        Reserva procesada por Markix Platform
      </p>
    </div>
  );
}
