'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar, Clock, User, Share2, ArrowRight } from "lucide-react";
import { WhatsAppIcon } from '@/components/icons';
import type { Reservation } from "@/models/booking";

interface SuccessViewProps {
  reservation: Reservation;
  onClose: () => void;
}

export function SuccessView({ reservation, onClose }: SuccessViewProps) {
  const handleAddToCalendar = () => {
    const title = `Cita en Markix: ${reservation.serviceId}`;
    const details = `Cita con ${reservation.staffId || 'Especialista'}`;
    const start = reservation.date.replace(/-/g, '') + 'T' + reservation.startTime.replace(/:/g, '') + '00';
    const end = reservation.date.replace(/-/g, '') + 'T' + reservation.endTime.replace(/:/g, '') + '00';
    
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&details=${encodeURIComponent(details)}&dates=${start}/${end}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-2xl mx-auto animate-in zoom-in fade-in duration-700">
      <Card className="rounded-[3rem] shadow-2xl border-none overflow-hidden text-center bg-white">
        <div className="bg-primary h-3 w-full" />
        <CardHeader className="pt-12 pb-6">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-green-50 rounded-full animate-bounce">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
          </div>
          <CardTitle className="text-3xl font-black text-gray-900 tracking-tight">¡Cita Agendada!</CardTitle>
          <p className="text-muted-foreground font-medium mt-2">Hemos recibido tu solicitud exitosamente.</p>
        </CardHeader>

        <CardContent className="px-8 pb-10 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 bg-muted/30 rounded-[2rem] border border-dashed border-muted-foreground/20">
                <div className="flex flex-col items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Fecha</p>
                        <p className="font-bold text-sm">{reservation.date}</p>
                    </div>
                </div>
                <div className="flex flex-col items-center gap-2 border-y sm:border-y-0 sm:border-x py-4 sm:py-0">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Hora</p>
                        <p className="font-bold text-sm">{reservation.startTime}</p>
                    </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    <div>
                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Profesional</p>
                        <p className="font-bold text-sm">{reservation.staffName || 'Asignado'}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <p className="text-sm text-gray-600 leading-relaxed font-medium px-4">
                    Tu reservación se encuentra en estado <strong>Pendiente</strong>. Recibirás un mensaje de confirmación por WhatsApp en breve.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button variant="outline" className="rounded-xl font-bold gap-2" onClick={handleAddToCalendar}>
                        <Calendar className="h-4 w-4" /> Agregar a Google Calendar
                    </Button>
                    <Button variant="outline" className="rounded-xl font-bold gap-2 bg-[#25D366] text-white hover:bg-[#128C7E] border-none">
                        <WhatsAppIcon className="h-4 w-4" /> Notificar por WhatsApp
                    </Button>
                </div>
            </div>
        </CardContent>

        <CardFooter className="bg-muted/30 p-8 flex flex-col gap-4">
            <Button onClick={onClose} className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/10">
                Finalizar y Volver <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default SuccessView;
