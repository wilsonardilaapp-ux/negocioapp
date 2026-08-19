'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Calendar, 
  Clock, 
  User, 
  ArrowLeft,
  CalendarPlus,
  Share2
} from 'lucide-react';
import { formatReservationDate } from '@/lib/utils';
import type { Reservation } from '@/models/booking';
import Link from 'next/link';

interface SuccessViewProps {
  reservation: Reservation;
  businessName: string;
}

export function SuccessView({ reservation, businessName }: SuccessViewProps) {
  const handleAddToCalendar = () => {
    // Implementación simple de enlace a Google Calendar
    const startTime = reservation.startTime.replace(':', '');
    const endTime = reservation.endTime.replace(':', '');
    const startDate = reservation.date.replace(/-/g, '');

    // Si la hora de fin es menor a la de inicio, la cita cruza medianoche: sumar un día a la fecha de fin
    const crossesMidnight = reservation.endTime < reservation.startTime;
    const endDateObj = new Date(`${reservation.date}T00:00:00`);
    if (crossesMidnight) {
      endDateObj.setDate(endDateObj.getDate() + 1);
    }
    const endDate = `${endDateObj.getFullYear()}${String(endDateObj.getMonth() + 1).padStart(2, '0')}${String(endDateObj.getDate()).padStart(2, '0')}`;

    const text = encodeURIComponent(`Cita en ${businessName}: ${reservation.serviceName}`);
    const dates = `${startDate}T${startTime}00/${endDate}T${endTime}00`;
    
    window.open(`https://www.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=Cita+agendada+desde+Markix`, '_blank');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Cita en ${businessName}`,
        text: `¡Hola! Agendé una cita para ${reservation.serviceName} el ${reservation.date} a las ${reservation.startTime}.`,
        url: window.location.origin
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in duration-500 max-w-lg mx-auto">
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="p-4 bg-green-100 rounded-full animate-bounce">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
        </div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">¡Cita Agendada!</h2>
        <p className="text-muted-foreground font-medium">Hemos recibido tu solicitud. Te esperamos pronto.</p>
      </div>

      <Card className="border-2 shadow-xl rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-primary text-white p-6">
          <CardTitle className="text-lg uppercase tracking-widest font-black text-center">Resumen del Turno</CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-6 bg-white">
          <div className="grid grid-cols-2 gap-6 border-b border-dashed pb-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Fecha</p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <p className="font-bold text-gray-900">{formatReservationDate(reservation.date)}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Hora</p>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <p className="font-bold text-gray-900">{reservation.startTime}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
             <div className="flex justify-between items-center bg-muted/30 p-3 rounded-xl">
                <div className="space-y-0.5">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Servicio</p>
                    <p className="font-bold text-gray-900 truncate">{reservation.serviceName}</p>
                </div>
                <div className="space-y-0.5 text-right">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Profesional</p>
                    <p className="font-bold text-gray-900">{reservation.staffName || 'Profesional asignado'}</p>
                </div>
             </div>

             <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
                <User className="h-5 w-5 text-primary" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Cliente</span>
                  <span className="font-bold text-gray-800">{reservation.customerName}</span>
                </div>
             </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/20 p-6 flex flex-col gap-3">
          <Button className="w-full h-12 font-black gap-2 shadow-lg" onClick={handleAddToCalendar}>
            <CalendarPlus className="h-5 w-5" /> Agregar a Google Calendar
          </Button>
          <div className="grid grid-cols-2 gap-3 w-full">
            <Button variant="outline" className="font-bold gap-2 bg-white" onClick={handleShare}>
              <Share2 className="h-4 w-4" /> Compartir
            </Button>
            <Button variant="ghost" className="font-bold text-primary" asChild>
              <Link href={`/reservar/${reservation.businessId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Agendar otra
              </Link>
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      <div className="text-center">
        <Button variant="link" asChild className="text-muted-foreground">
          <Link href="/">Volver al inicio</Link>
        </Button>
      </div>
    </div>
  );
}
