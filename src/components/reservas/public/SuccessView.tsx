'use client';

import React from 'react';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar, Clock, User, Share2, Smartphone, Sparkles, Home } from "lucide-react";
import type { Reservation } from "@/models/booking";
import Link from 'next/link';

export function SuccessView({ reservation, formatAction }: { reservation: Reservation, formatAction: (d: string) => string }) {
  const handleAddToCalendar = () => {
    const start = reservation.date.replace(/-/g, '') + 'T' + reservation.startTime.replace(':', '') + '00Z';
    const end = reservation.date.replace(/-/g, '') + 'T' + reservation.endTime.replace(':', '') + '00Z';
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(reservation.serviceName || 'Cita de Servicio')}&dates=${start}/${end}&details=${encodeURIComponent('Reserva confirmada vía Markix SaaS')}&location=${encodeURIComponent('Local del negocio')}`;
    window.open(url, '_blank');
  };

  return (
    <div className="animate-in zoom-in-95 fade-in duration-700">
      <CardHeader className="p-10 text-center bg-green-50 border-b">
        <div className="flex justify-center mb-6">
            <div className="p-4 bg-white rounded-[2rem] shadow-xl border-4 border-white ring-8 ring-green-500/10">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
        </div>
        <CardTitle className="text-4xl font-black tracking-tighter text-green-900 mb-2">¡Cita Confirmada!</CardTitle>
        <CardDescription className="text-lg font-bold text-green-700/70 uppercase tracking-widest">Reserva #{reservation.id.slice(-6).toUpperCase()}</CardDescription>
      </CardHeader>
      
      <CardContent className="p-10 space-y-10">
        <div className="text-center max-w-md mx-auto">
            <p className="text-gray-600 leading-relaxed font-medium">
                Hola <span className="text-gray-900 font-black">{reservation.customerName}</span>, tu reserva ha sido registrada con éxito. Hemos enviado una notificación al negocio para preparar tu llegada.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center p-6 bg-muted/30 rounded-[2.5rem] border border-dashed transition-transform hover:scale-105">
                <div className="p-3 bg-white rounded-2xl shadow-sm mb-4"><Calendar className="h-6 w-6 text-primary" /></div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Fecha</p>
                <p className="font-bold text-gray-900 text-center leading-tight">{formatAction(reservation.date)}</p>
            </div>
            <div className="flex flex-col items-center p-6 bg-muted/30 rounded-[2.5rem] border border-dashed transition-transform hover:scale-105">
                <div className="p-3 bg-white rounded-2xl shadow-sm mb-4"><Clock className="h-6 w-6 text-primary" /></div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Hora</p>
                <p className="font-black text-2xl text-gray-900">{reservation.startTime}</p>
            </div>
            <div className="flex flex-col items-center p-6 bg-muted/30 rounded-[2.5rem] border border-dashed transition-transform hover:scale-105">
                <div className="p-3 bg-white rounded-2xl shadow-sm mb-4"><User className="h-6 w-6 text-primary" /></div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Profesional</p>
                <p className="font-bold text-gray-900 text-center leading-tight">{reservation.staffName || 'Asignado'}</p>
            </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={handleAddToCalendar} variant="outline" className="h-12 px-8 font-black rounded-2xl border-primary text-primary hover:bg-primary/5">
                <Calendar className="mr-2 h-4 w-4" /> Agregar a mi Calendario
            </Button>
            <Button asChild className="h-12 px-8 font-black rounded-2xl shadow-xl shadow-primary/10">
                <Link href="/">
                    <Home className="mr-2 h-4 w-4" /> Volver al Inicio
                </Link>
            </Button>
        </div>
      </CardContent>

      <CardFooter className="bg-muted/10 p-8 text-center flex flex-col items-center gap-3">
         <p className="text-xs text-muted-foreground font-medium italic">¿Necesitas ayuda con tu reserva?</p>
         <Button variant="ghost" size="sm" className="gap-2 text-primary font-bold">
            <Smartphone className="h-4 w-4" /> Contactar por WhatsApp
         </Button>
      </CardFooter>
    </div>
  );
}
