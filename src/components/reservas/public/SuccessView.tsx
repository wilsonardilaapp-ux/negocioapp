'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  Download, 
  Printer, 
  MessageCircle, 
  ExternalLink 
} from 'lucide-react';
import { formatReservationDate, normalizePhoneNumber } from '@/lib/utils';
import type { Reservation } from '@/models/booking';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Vista de éxito tras completar una reserva pública.
 * Muestra el resumen y ofrece acciones de seguimiento (WhatsApp, Calendario, Impresión).
 */

interface SuccessViewProps {
  reservation: Reservation;
  businessName: string;
}

export function SuccessView({ reservation, businessName }: SuccessViewProps) {
  const whatsappNumber = normalizePhoneNumber(reservation.customerPhone);
  const whatsappMessage = encodeURIComponent(
    `¡Hola! Confirmo mi cita de ${reservation.serviceName} el ${formatReservationDate(reservation.date)} a las ${reservation.startTime} en ${businessName}.`
  );

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

  const handlePrint = () => {
    window.print();
  };

  return (
    <Card className="rounded-[2rem] border-none shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
      <CardHeader className="bg-primary/5 border-b pb-8 pt-10 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-white rounded-full shadow-xl ring-8 ring-primary/5">
            <CheckCircle2 className="h-12 w-12 text-primary" />
          </div>
        </div>
        <CardTitle className="text-3xl font-black tracking-tight text-gray-900">¡Reserva Exitosa!</CardTitle>
        <CardDescription className="text-base font-medium text-primary/80">Tu turno ha sido agendado correctamente.</CardDescription>
      </CardHeader>

      <CardContent className="p-8 space-y-8">
        {/* Resumen Principal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-muted rounded-xl"><Calendar className="h-5 w-5 text-muted-foreground" /></div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Fecha</p>
                <p className="font-bold text-gray-900">{formatReservationDate(reservation.date)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-muted rounded-xl"><Clock className="h-5 w-5 text-muted-foreground" /></div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Horario</p>
                <p className="font-bold text-gray-900">{reservation.startTime} — {reservation.endTime}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-muted rounded-xl"><MapPin className="h-5 w-5 text-muted-foreground" /></div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Servicio</p>
                <p className="font-bold text-gray-900 truncate">{reservation.serviceName}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-muted rounded-xl"><User className="h-5 w-5 text-muted-foreground" /></div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Especialista</p>
                <p className="font-bold text-gray-900">{reservation.staffName || 'Profesional asignado'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones de seguimiento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`} target="_blank" rel="noopener noreferrer" className="block">
            <Button className="w-full h-14 text-lg font-black gap-2 shadow-xl shadow-green-100 bg-[#25D366] hover:bg-[#128C7E] text-white transition-transform active:scale-95 border-none">
              <MessageCircle className="h-6 w-6" /> Abrir WhatsApp
            </Button>
          </a>
          <Button 
            variant="outline" 
            className="h-14 text-lg font-black gap-2 rounded-xl border-2 hover:bg-muted"
            onClick={handleAddToCalendar}
          >
            <ExternalLink className="h-6 w-6" /> Google Calendar
          </Button>
        </div>

        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-3">
          <div className="p-1 bg-white rounded-lg shadow-sm shrink-0">
             <Phone className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-[11px] text-blue-800 leading-tight font-medium">
            Te recomendamos abrir el chat de WhatsApp para recibir actualizaciones automáticas y recordatorios sobre tu cita.
          </p>
        </div>
      </CardContent>

      <CardFooter className="bg-muted/30 p-6 flex justify-center gap-4 border-t">
        <Button variant="ghost" size="sm" onClick={handlePrint} className="text-xs font-bold uppercase tracking-widest gap-2">
          <Printer className="h-4 w-4" /> Imprimir Comprobante
        </Button>
        <Button variant="ghost" size="sm" className="text-xs font-bold uppercase tracking-widest gap-2">
          <Download className="h-4 w-4" /> Guardar Imagen
        </Button>
      </CardFooter>
    </Card>
  );
}
