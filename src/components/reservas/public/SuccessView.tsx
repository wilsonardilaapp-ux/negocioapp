'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Calendar, Clock, MapPin, Share2, ArrowRight, Smartphone } from 'lucide-react';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { Reservation } from '@/models/booking';
import Link from 'next/link';

interface SuccessViewProps {
  reservation: Reservation;
  businessId: string;
}

/**
 * Helper resiliente para formatear fechas en el cliente evitando desfases UTC.
 */
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

export function SuccessView({ reservation, businessId }: SuccessViewProps) {
  
  const handleAddToCalendar = () => {
    const title = `Cita en Markix: ${reservation.serviceId}`;
    const [h, m] = reservation.startTime.split(':').map(Number);
    const start = new Date(reservation.date + 'T00:00:00');
    start.setHours(h, m);
    
    const end = new Date(start.getTime() + (reservation.durationMinutes || 30) * 60000);
    
    const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(reservation.notes || '')}`;
    
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-xl mx-auto py-10 animate-in zoom-in duration-500">
      <Card className="rounded-[3rem] border-none shadow-2xl overflow-hidden bg-white text-center">
        <CardHeader className="bg-primary pt-16 pb-12 text-white relative">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
             <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full border-[10px] border-white"></div>
             <div className="absolute top-20 -right-10 w-60 h-60 rounded-full border-[20px] border-white"></div>
          </div>
          
          <div className="flex justify-center mb-6 scale-125">
            <div className="bg-white rounded-full p-4 shadow-xl animate-bounce">
              <CheckCircle2 className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-4xl font-black tracking-tight mb-2">¡Cita agendada!</CardTitle>
          <CardDescription className="text-white/80 text-lg font-medium">Tu espacio ha sido reservado con éxito.</CardDescription>
        </CardHeader>

        <CardContent className="p-10 space-y-8">
          <div className="space-y-4">
             <div className="p-6 bg-muted/30 rounded-[2rem] border-2 border-dashed space-y-4">
                <div className="space-y-1">
                   <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Fecha Seleccionada</p>
                   <p className="text-xl font-bold text-gray-900 leading-tight capitalize">
                     {formatDateSafe(reservation?.date)}
                   </p>
                </div>
                <div className="flex justify-center items-center gap-6">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Hora</p>
                        <div className="flex items-center gap-2 justify-center">
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="text-2xl font-black text-gray-900">{reservation?.startTime}</span>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-gray-200"></div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Servicio</p>
                        <span className="text-sm font-bold text-gray-700">{reservation?.serviceId}</span>
                    </div>
                </div>
             </div>

             <div className="flex flex-col gap-3 pt-4">
                <Button onClick={handleAddToCalendar} variant="outline" className="h-12 rounded-xl font-bold gap-2">
                    <Calendar className="h-4 w-4" /> Agregar a Google Calendar
                </Button>
                <Button asChild variant="secondary" className="h-12 rounded-xl font-bold gap-2">
                    <a href={`https://wa.me/?text=${encodeURIComponent(`¡Hola! Tengo una cita confirmada para ${reservation.serviceId} el ${reservation.date} a las ${reservation.startTime}.`)}`} target="_blank" rel="noopener noreferrer">
                        <Share2 className="h-4 w-4" /> Compartir reserva
                    </a>
                </Button>
             </div>
          </div>
        </CardContent>

        <CardFooter className="bg-muted/30 p-8 border-t flex flex-col gap-4">
            <p className="text-xs text-muted-foreground font-medium leading-relaxed max-w-xs mx-auto">
                Recibirás un mensaje de confirmación por WhatsApp en unos minutos con los detalles finales.
            </p>
            <Button asChild className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/10">
                <Link href="/">
                    Finalizar y Volver <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default SuccessView;
