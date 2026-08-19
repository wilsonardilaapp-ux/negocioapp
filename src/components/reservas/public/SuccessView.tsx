'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar, Clock, User, ArrowRight, Share2, Smartphone } from "lucide-react";
import { formatReservationDate } from "../../../lib/utils";
import Link from 'next/link';

interface SuccessViewProps {
  reservation: any;
  businessId: string;
}

export function SuccessView({ reservation, businessId }: SuccessViewProps) {
  const whatsappNumber = "3228831634"; // Fallback de soporte
  
  const handleAddToCalendar = () => {
    const title = `Cita: ${reservation?.serviceName || 'Reserva'}`;
    const date = reservation?.date?.replace(/-/g, '') || '';
    const startTime = reservation?.startTime?.replace(':', '') || '';
    const details = `Profesional: ${reservation?.staffName || 'Asignado'}`;
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${date}T${startTime}00Z/${date}T${startTime}00Z&details=${encodeURIComponent(details)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in zoom-in duration-500">
      <Card className="rounded-[3rem] border-none shadow-2xl overflow-hidden bg-white">
        <div className="bg-primary h-3 w-full" />
        <CardHeader className="p-10 text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-green-50 rounded-full ring-8 ring-green-50/50">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-4xl font-black tracking-tight text-gray-900">¡Cita Confirmada!</CardTitle>
            <CardDescription className="text-lg font-medium text-gray-500">
              Hemos registrado tu reserva exitosamente.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-10 pb-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 bg-muted/30 rounded-3xl border border-dashed border-muted-foreground/20 space-y-1">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Fecha del Turno</p>
              <p className="font-bold text-gray-900 text-center leading-tight">
                {formatReservationDate(reservation?.date)}
              </p>
            </div>
            <div className="p-6 bg-muted/30 rounded-3xl border border-dashed border-muted-foreground/20 space-y-1 text-center">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Hora de Inicio</p>
              <p className="text-2xl font-black text-primary">{reservation?.startTime || '--:--'}</p>
            </div>
          </div>

          <div className="space-y-4 p-6 bg-primary/5 rounded-[2rem] border border-primary/10">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Profesional Asignado</p>
                <p className="font-bold text-gray-900">{reservation?.staffName || 'Asignación automática'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Recordatorio</p>
                <p className="text-sm font-medium text-gray-600">Te enviaremos un WhatsApp antes de tu cita.</p>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-10 bg-muted/20 border-t flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <Button 
              variant="outline" 
              className="h-12 font-bold rounded-xl gap-2 bg-white"
              onClick={handleAddToCalendar}
            >
              <Share2 className="h-4 w-4" /> Agregar a mi Calendario
            </Button>
            <Button 
              variant="outline" 
              className="h-12 font-bold rounded-xl gap-2 bg-white"
              onClick={() => window.open(`https://wa.me/${whatsappNumber}`, '_blank')}
            >
              <Smartphone className="h-4 w-4" /> Contactar Negocio
            </Button>
          </div>
          <Button asChild className="w-full h-14 text-lg font-black rounded-2xl shadow-xl">
             <Link href={`/catalog/${businessId}`}>
                Volver al catálogo <ArrowRight className="ml-2 h-5 w-5" />
             </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default SuccessView;
