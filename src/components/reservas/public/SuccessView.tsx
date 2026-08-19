'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Share2, 
  ArrowRight,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { WhatsAppIcon } from '@/components/icons';
import { formatReservationDate, normalizePhoneNumber } from '@/lib/utils';
import Link from 'next/link';

interface SuccessViewProps {
  reservation: any;
  businessName: string;
}

export function SuccessView({ reservation, businessName }: SuccessViewProps) {
  
  const handleAddToCalendar = () => {
    const text = `Cita en ${businessName}: ${reservation?.serviceName || 'Servicio'}`;
    const details = `Profesional: ${reservation?.staffName || 'Asignado'}`;
    const dateStr = reservation?.date?.replace(/-/g, '');
    const timeStr = reservation?.startTime?.replace(':', '');
    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}&details=${encodeURIComponent(details)}&dates=${dateStr}T${timeStr}00/${dateStr}T${timeStr}00`;
    window.open(url, '_blank');
  };

  const handleShareWhatsApp = () => {
    const message = `¡Hola! 👋 Confirmé mi cita en *${businessName}* para el ${formatReservationDate(reservation?.date)} a las ${reservation?.startTime}. ¡Nos vemos allá!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in zoom-in duration-500">
      <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white text-center">
        <CardHeader className="p-10 pb-6 bg-primary/5">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white rounded-full shadow-xl ring-8 ring-primary/5">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
          </div>
          <CardTitle className="text-3xl font-black tracking-tight text-gray-900">¡Cita Agendada!</CardTitle>
          <CardDescription className="text-lg font-medium text-gray-600 mt-2">
            Tu reserva ha sido registrada correctamente.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-10 pt-6 space-y-8">
          {/* Ficha del Turno */}
          <div className="p-8 bg-muted/30 rounded-[2rem] border-2 border-dashed border-primary/20 space-y-6">
            <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Fecha Seleccionada</span>
                <p className="text-xl font-black text-gray-900 leading-tight">
                  {formatReservationDate(reservation?.date)}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-primary/5">
                <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1.5">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-black uppercase text-muted-foreground">Hora</span>
                    </div>
                    <p className="font-bold text-base">{reservation?.startTime || '--'}</p>
                </div>
                <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1.5">
                        <User className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-black uppercase text-muted-foreground">Profesional</span>
                    </div>
                    <p className="font-bold text-base truncate px-2">{reservation?.staffName || 'Asignado'}</p>
                </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
             <Button variant="outline" className="h-12 font-bold rounded-xl gap-2 bg-white" onClick={handleAddToCalendar}>
                <ExternalLink className="h-4 w-4" /> Agregar a Calendar
             </Button>
             <Button variant="outline" className="h-12 font-bold rounded-xl gap-2 bg-white" onClick={handleShareWhatsApp}>
                <Share2 className="h-4 w-4" /> Compartir Cita
             </Button>
          </div>

          <div className="flex items-center justify-center gap-2 p-4 bg-blue-50 text-blue-700 rounded-2xl text-xs font-medium">
             <Sparkles className="h-4 w-4 fill-blue-700" />
             Te hemos enviado un mensaje de confirmación a tu WhatsApp.
          </div>
        </CardContent>

        <CardFooter className="p-8 pt-0 border-t bg-muted/10 flex flex-col gap-4">
           <Button className="w-full h-14 text-lg font-black rounded-2xl group shadow-lg shadow-primary/10" asChild>
              <Link href="/">
                Volver al Inicio <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
           </Button>
           <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
             Gracias por confiar en {businessName}
           </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default SuccessView;
