'use client';

import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Calendar, Clock, User, Download, ExternalLink, Loader2 } from 'lucide-react';
import { formatReservationDate, normalizePhoneNumber } from '@/lib/utils';
import type { Reservation } from '@/models/booking';
import { WhatsAppIcon } from '@/components/icons';
import html2canvas from 'html2canvas';

interface SuccessViewProps {
  reservation: Reservation;
  businessName: string;
}

export function SuccessView({ reservation, businessName }: SuccessViewProps) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
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

  const handleDownloadImage = async () => {
    if (!ticketRef.current) return;
    
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2, // Alta resolución para lectura de QR y textos
        backgroundColor: '#ffffff', // Asegura fondo blanco limpio
        logging: false,
        useCORS: true // Prevención de bloqueos si hay imágenes externas
      });
      
      const link = document.createElement('a');
      link.download = `comprobante-reserva-${reservation.id.slice(-6).toUpperCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error("Error al generar comprobante:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 bg-green-100 rounded-full mb-2">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">¡Reserva Exitosa!</h2>
        <p className="text-muted-foreground">Tu turno ha sido agendado y notificado al negocio.</p>
      </div>

      {/* Contenedor del Ticket referenciado para captura */}
      <div ref={ticketRef}>
        <Card className="border-2 shadow-xl overflow-hidden rounded-[2.5rem]">
          <CardHeader className="bg-primary/5 border-b p-8 pb-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <CardTitle className="text-2xl font-black text-primary">{businessName}</CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-widest text-primary/70">Comprobante de Cita</CardDescription>
              </div>
              <Badge variant="outline" className="bg-white border-primary/20 text-primary font-black uppercase text-[10px] tracking-tighter">Confirmado</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Fecha</p>
                <div className="flex items-center gap-2 font-bold text-gray-900">
                  <Calendar className="h-4 w-4 text-primary" />
                  {formatReservationDate(reservation.date)}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Hora</p>
                <div className="flex items-center gap-2 font-bold text-gray-900">
                  <Clock className="h-4 w-4 text-primary" />
                  {reservation.startTime}
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-dashed">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Servicio</p>
                  <p className="font-bold text-gray-900 truncate">{reservation.serviceName}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Profesional</p>
                  <p className="font-bold text-gray-600 truncate">{reservation.staffName || 'Asignado'}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">ID Reserva</p>
                  <p className="font-mono text-xs font-bold uppercase">{reservation.id.slice(-8)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total</p>
                  <p className="text-xl font-black text-primary">${reservation.price.toLocaleString('es-CO')}</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-muted/30 rounded-2xl border border-dashed flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Titular</span>
                <span className="text-sm font-bold text-gray-900">{reservation.customerName}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 pt-4">
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1 gap-2 border-orange-200 text-orange-600 hover:bg-orange-50 h-12 font-bold"
            onClick={handleDownloadImage}
            disabled={isDownloading}
          >
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Guardar Imagen
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 gap-2 h-12 font-bold border-blue-200 text-blue-600 hover:bg-blue-50"
            onClick={handleAddToCalendar}
          >
            <ExternalLink className="h-4 w-4" />
            Calendario
          </Button>
        </div>
        
        <Button 
          className="w-full h-14 text-lg font-black gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white shadow-xl shadow-green-100 rounded-2xl"
          asChild
        >
          <a href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon className="h-5 w-5" />
            Abrir WhatsApp
          </a>
        </Button>

        <Button variant="ghost" className="w-full font-bold text-muted-foreground" onClick={() => window.location.reload()}>
          Realizar otra reserva
        </Button>
      </div>
    </div>
  );
}
