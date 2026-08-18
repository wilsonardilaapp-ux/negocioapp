'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    format, 
    addMonths, 
    subMonths, 
    startOfMonth, 
    endOfMonth, 
    eachDayOfInterval, 
    isSameDay, 
    isBefore, 
    startOfDay 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateTimeSlots, isSlotAvailable } from '@/lib/booking-engine';
import type { BookingService, BookingAvailability, Reservation } from '@/models/booking';
import { calculateEndTime } from '@/models/booking';

interface TimeStepProps {
  businessId: string;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  selectedTime: string;
  setSelectedTime: (time: string) => void;
  selectedService: BookingService;
  selectedStaffId: string;
  availability: BookingAvailability[];
  existingReservations: Reservation[];
}

export function TimeStep({
  businessId,
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  selectedService,
  selectedStaffId,
  availability,
  existingReservations,
}: TimeStepProps) {
  
  /**
   * Función de seguridad para garantizar objetos Date válidos.
   * Previene RangeError: Invalid time value al formatear fechas.
   */
  const safeDate = (date: any): Date => {
    if (date instanceof Date && !isNaN(date.getTime())) return date;
    if (typeof date === 'string' && date) {
      const parsed = new Date(date.includes('T') ? date : `${date}T00:00:00`);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    if (typeof date === 'number' && !isNaN(date)) {
        const d = new Date(date);
        if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  };

  // Inicialización blindada del estado de visualización del mes
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const d = safeDate(selectedDate);
    return startOfMonth(d);
  });

  const handlePrevMonth = () => setViewMonth(prev => subMonths(safeDate(prev), 1));
  const handleNextMonth = () => setViewMonth(prev => addMonths(safeDate(prev), 1));

  // Días a mostrar en el grid del calendario
  const daysInMonth = useMemo(() => {
    const d = safeDate(viewMonth);
    const s = startOfMonth(d);
    const e = endOfMonth(d);
    return eachDayOfInterval({ start: s, end: e });
  }, [viewMonth]);

  // Generación de slots disponibles filtrados
  const availableSlots = useMemo(() => {
    const d = safeDate(selectedDate);
    const dayOfWeek = d.getDay();
    
    // Normalización de tipos para encontrar la jornada (number vs string)
    const dayAvail = availability?.find(a => Number(a.dayOfWeek) === dayOfWeek);

    if (!dayAvail || !dayAvail.isOpen || !selectedService) return [];

    const allSlots = generateTimeSlots(15);
    const now = new Date();
    const isToday = isSameDay(d, now);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return allSlots.filter(startTime => {
      // 1. Filtrar horas pasadas si es hoy (margen de 30 min)
      if (isToday) {
        const [h, m] = startTime.split(':').map(Number);
        if (h * 60 + m <= currentMinutes + 30) return false;
      }

      // 2. Validar disponibilidad contra agenda
      const endTime = calculateEndTime(startTime, selectedService.durationMinutes);
      
      // Si es un profesional específico o "Cualquiera"
      const staffReservations = (selectedStaffId === 'any' || !selectedStaffId) 
        ? existingReservations 
        : existingReservations.filter(r => r.staffId === selectedStaffId);

      const check = isSlotAvailable(
        { start: startTime, end: endTime },
        dayAvail,
        staffReservations
      );

      return check.available;
    });
  }, [selectedDate, selectedService, selectedStaffId, availability, existingReservations]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
      {/* Columna Izquierda: Calendario */}
      <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-gray-900 capitalize text-lg tracking-tight">
              {format(safeDate(viewMonth), 'MMMM yyyy', { locale: es })}
            </h3>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handlePrevMonth}
                disabled={isBefore(startOfMonth(safeDate(viewMonth)), startOfMonth(new Date()))}
                className="h-8 w-8 rounded-full"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleNextMonth}
                className="h-8 w-8 rounded-full"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
           <div className="grid grid-cols-7 gap-1 mb-4">
             {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
               <div key={i} className="text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest">{d}</div>
             ))}
           </div>
           <div className="grid grid-cols-7 gap-1">
              {daysInMonth.map((day) => {
                const d = safeDate(day);
                const isSelected = isSameDay(d, selectedDate);
                const isPast = isBefore(startOfDay(d), startOfDay(new Date()));
                const dayOfWeek = d.getDay();
                const isClosed = !availability?.find(a => Number(a.dayOfWeek) === dayOfWeek)?.isOpen;

                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    disabled={isPast || isClosed}
                    onClick={() => setSelectedDate(d)}
                    className={cn(
                      "aspect-square rounded-2xl flex flex-col items-center justify-center text-sm transition-all relative border-2 border-transparent",
                      isSelected ? "bg-primary text-white shadow-lg scale-110 z-10 border-primary" : "hover:bg-muted hover:border-muted",
                      (isPast || isClosed) && "opacity-10 cursor-not-allowed grayscale",
                      !isSelected && !isPast && !isClosed && "text-gray-900 font-bold"
                    )}
                  >
                    {format(d, 'd')}
                    {isSelected && <div className="absolute bottom-2 w-1 h-1 bg-white rounded-full" />}
                  </button>
                );
              })}
           </div>
        </CardContent>
      </Card>

      {/* Columna Derecha: Horarios */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-primary/10 rounded-xl">
                <Clock className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-black text-gray-900 uppercase tracking-tighter">Horas Disponibles</h3>
        </div>

        {availableSlots.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 animate-in fade-in slide-in-from-right-2 duration-500">
            {availableSlots.map(slot => (
              <Button
                key={slot}
                type="button"
                variant={selectedTime === slot ? "default" : "outline"}
                className={cn(
                  "h-12 font-black rounded-2xl border-2 transition-all",
                  selectedTime === slot ? "border-primary shadow-md scale-105 bg-primary text-white" : "border-muted-foreground/10 hover:border-primary/30"
                )}
                onClick={() => setSelectedTime(slot)}
              >
                {slot}
              </Button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-[2rem] border-2 border-dashed gap-4 animate-in fade-in zoom-in duration-300">
             <div className="p-4 bg-muted rounded-3xl">
                <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
             </div>
             <div className="space-y-1">
                <p className="font-black text-gray-800 uppercase tracking-tight">Sin turnos para este día</p>
                <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    Intenta seleccionando otra fecha o consulta disponibilidad con otro profesional.
                </p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
