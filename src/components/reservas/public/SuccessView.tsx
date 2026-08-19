'use client';

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    CheckCircle2, 
    Calendar, 
    Clock, 
    User, 
    MapPin, 
    ExternalLink, 
    CalendarDays,
    Sparkles,
    Smartphone
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons";
import type { Reservation } from "@/models/booking";
import { formatReservationDate, normalizePhoneNumber } from "@/lib/utils";
import Link from "next/link";

interface SuccessViewProps {
  reservation: Reservation;
  businessName: string;
}

export function SuccessView({ reservation, businessName }: SuccessViewProps) {
  const whatsappNumber = normalizePhoneNumber(reservation.customerPhone);
  
  const handleAddToCalendar = () => {
    // Implementación simple de enlace a Google Calendar
    const startTime = reservation.startTime.replace(':', '');
    const endTime = reservation.endTime.replace(':', '');
    const date = reservation.date.replace(/-/g, '');
    const text = encodeURIComponent(`Cita en ${businessName}: ${reservation.serviceId}`);
    const dates = `${date}T${startTime}00/${date}T${endTime}00`;
    
    window.open(`https://www.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=Cita+agendada+desde+Markix`, '_blank');
  };

  return (
    <div className="max-w-2xl mx-auto animate-in zoom-in duration-500 pb-20">
      <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white">
        <div className="bg-primary h-3 w-full" />
        <CardHeader className="pt-12 pb-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-green-50 rounded-full relative">
                <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-20" />
                <CheckCircle2 className="h-16 w-16 text-green-500 relative z-10" />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black tracking-tight text-gray-900">¡Cita Confirmada!</CardTitle>
            <CardDescription className="text-base font-medium">
              Todo listo, {reservation.customerName}. Te esperamos en <strong>{businessName}</strong>.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="px-8 pb-8 space-y-8">
            {/* Ficha de la Cita */}
            <div className="bg-muted/30 rounded-[2.5rem] p-8 border-2 border-dashed border-muted relative">
                <div className="absolute -top-3 left-8">
                    <Badge className="bg-primary text-white font-black text-[10px] uppercase px-4 border-none shadow-lg">
                        Ticket de Reserva #{reservation.id.slice(-6).toUpperCase()}
                    </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100"><CalendarDays className="h-5 w-5 text-primary" /></div>
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Fecha</p>
                                <p className="font-bold text-gray-900 capitalize">{formatReservationDate(reservation.date)}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100"><Clock className="h-5 w-5 text-primary" /></div>
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Hora</p>
                                <p className="font-bold text-gray-900">{reservation.startTime} — {reservation.endTime}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100"><Sparkles className="h-5 w-5 text-primary" /></div>
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Servicio</p>
                                <p className="font-bold text-gray-900 truncate">{reservation.serviceId}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100"><User className="h-5 w-5 text-primary" /></div>
                            <div>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Atendido por</p>
                                <p className="font-bold text-gray-900">{reservation.staffName || 'Profesional asignado'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-start gap-4 p-5 bg-blue-50 border border-blue-100 rounded-[2rem] text-blue-800">
                <Smartphone className="h-6 w-6 shrink-0 text-blue-600 mt-1" />
                <div className="space-y-1">
                    <p className="font-bold text-sm">Aviso de Recordatorio</p>
                    <p className="text-xs leading-relaxed opacity-90 font-medium">
                        Hemos enviado los detalles a tu WhatsApp <strong>{reservation.customerPhone}</strong>. Por favor, asegúrate de estar 10 minutos antes de la hora acordada.
                    </p>
                </div>
            </div>
        </CardContent>

        <CardFooter className="bg-muted/20 border-t p-8 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                <Button onClick={handleAddToCalendar} variant="outline" className="h-12 font-bold rounded-2xl bg-white border-2 border-gray-100 hover:bg-gray-50 hover:border-primary/20">
                    <Calendar className="mr-2 h-4 w-4 text-primary" /> Añadir al Calendario
                </Button>
                <Button asChild className="h-12 font-black rounded-2xl shadow-lg bg-[#25D366] hover:bg-[#128C7E] text-white border-none">
                    <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">
                        <WhatsAppIcon className="mr-2 h-5 w-5" /> Abrir WhatsApp
                    </a>
                </Button>
            </div>
            <Button asChild variant="ghost" className="w-full font-bold text-muted-foreground">
                <Link href="/">Finalizar y Volver al Inicio</Link>
            </Button>
        </CardFooter>
      </Card>
      
      <p className="text-center mt-8 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] opacity-40">
        Reserva procesada por Markix Secure Agendamiento
      </p>
    </div>
  );
}

export default SuccessView;
