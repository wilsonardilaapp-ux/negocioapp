'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isPast, 
  startOfDay,
  addDays
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { generateTimeSlots, isSlotAvailable, timeToMinutes } from '@/lib/booking-engine';
import { calculateEndTime, type BookingService, type BookingStaff, type BookingAvailability, type Reservation } from '@/models/booking';

interface TimeStepProps {
  businessId: string;
  selectedService: BookingService;
  selectedStaff: BookingStaff | null;
  availability: BookingAvailability[];
  existingReservations: Reservation[];
  onSelect: (date: string, time: string) => void;
  onBack: () => void;
}

export function TimeStep({ 
  selectedService, 
  selectedStaff, 
  availability, 
  existingReservations, 
  onSelect, 
  onBack 
}: TimeStepProps) {
  
  const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 1));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState<Date>(new Date());

  // Función de fecha segura para evitar RangeError en format()
  const safeDate = (date: any): Date => {
    if (date instanceof Date && !isNaN(date.getTime())) return date;
    if (typeof date === 'string' || typeof date === 'number') {
      const d = new Date(date);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  };

  // Generar días del mes actual para el calendario
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(safeDate(viewMonth));
    const end = endOfMonth(start);
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  // Calcular turnos disponibles para el día seleccionado
  const availableSlots = useMemo(() => {
    if (!selectedDate) return [];

    const dayOfWeek = selectedDate.getDay();
    const dayAvail = (availability || []).find(a => Number(a.dayOfWeek) === dayOfWeek);

    if (!dayAvail || !dayAvail.isOpen) return [];

    const isToday = isSameDay(selectedDate, new Date());
    const nowMinutes = timeToMinutes(format(new Date(), 'HH:mm'));
    
    // Filtrar reservas que afectan al profesional seleccionado o a la agenda general si es 'Cualquiera'
    const dailyReservations = (existingReservations || []).filter(r => 
        isSameDay(new Date(r.date + 'T00:00:00'), selectedDate) &&
        (!selectedStaff || r.staffId === selectedStaff.id)
    );

    const allPossibleSlots = generateTimeSlots(15); // Slots cada 15 min

    return allPossibleSlots.filter(startTime => {
      // 1. Si es hoy, no permitir horas pasadas
      if (isToday && timeToMinutes(startTime) <= nowMinutes + 30) return false;

      const endTime = calculateEndTime(startTime, selectedService.durationMinutes);
      
      // 2. Validar contra jornada y colisiones usando el motor blindado
      const check = isSlotAvailable(
        { start: startTime, end: endTime },
        dayAvail,
        dailyReservations
      );

      return check.available;
    });
  }, [selectedDate, selectedService, selectedStaff, availability, existingReservations]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
      
      {/* COLUMNA IZQUIERDA: CALENDARIO */}
      <Card className="lg:col-span-7 border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
        <CardHeader className="bg-primary/5 border-b p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-gray-900 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              {format(safeDate(viewMonth), 'MMMM yyyy', { locale: es }).toUpperCase()}
            </h3>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setViewMonth(prev => subMonths(safeDate(prev), 1))}
                disabled={isPast(startOfMonth(safeDate(viewMonth)))}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setViewMonth(prev => addMonths(safeDate(prev), 1))}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-7 gap-2">
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
              <div key={i} className="text-center text-[10px] font-black text-muted-foreground py-2 uppercase tracking-widest">{d}</div>
            ))}
            {daysInMonth.map((day, i) => {
              const isSelected = isSameDay(day, selectedDate);
              const isPastDay = isPast(day) && !isSameDay(day, new Date());
              const dayOfWeek = day.getDay();
              const isClosed = !(availability || []).find(a => Number(a.dayOfWeek) === dayOfWeek)?.isOpen;

              return (
                <button
                  key={i}
                  disabled={isPastDay || isClosed}
                  onClick={() => {
                    setSelectedDate(day);
                    setSelectedTime(null);
                  }}
                  className={cn(
                    "aspect-square rounded-2xl flex flex-col items-center justify-center transition-all border-2",
                    isSelected ? "bg-primary border-primary text-white shadow-lg scale-110 z-10" : 
                    isPastDay || isClosed ? "opacity-20 cursor-not-allowed border-transparent bg-muted/50" :
                    "bg-white border-gray-50 hover:border-primary/30 hover:bg-primary/5 text-gray-700"
                  )}
                >
                  <span className="text-sm font-black">{format(day, 'd')}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
        <CardFooter className="bg-muted/20 p-4 border-t">
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase text-muted-foreground tracking-widest mx-auto">
                <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-primary" /> Seleccionado</div>
                <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-full bg-muted" /> No disponible</div>
            </div>
        </CardFooter>
      </Card>

      {/* COLUMNA DERECHA: HORARIOS */}
      <Card className="lg:col-span-5 border-none shadow-xl rounded-[2rem] overflow-hidden bg-white flex flex-col">
        <CardHeader className="bg-primary/5 border-b p-6">
          <CardTitle className="text-base font-black flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            TURNOS PARA EL {format(selectedDate, 'd MMM', { locale: es }).toUpperCase()}
          </CardTitle>
          <CardDescription className="text-xs font-medium">Selecciona la hora de inicio de tu cita.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-6">
          {availableSlots.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {availableSlots.map(time => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={cn(
                    "h-12 rounded-xl text-sm font-black transition-all border-2",
                    selectedTime === time 
                      ? "bg-primary border-primary text-white shadow-md scale-105" 
                      : "bg-white border-gray-100 text-gray-700 hover:border-primary/40 hover:bg-primary/5"
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
              <div className="p-4 bg-orange-50 rounded-full text-orange-500">
                <AlertCircle className="h-10 w-10" />
              </div>
              <div className="space-y-1">
                <p className="font-black text-gray-900">Sin turnos disponibles</p>
                <p className="text-xs text-muted-foreground">Intenta seleccionando otra fecha o profesional.</p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="p-6 border-t bg-muted/20 gap-3">
          <Button variant="ghost" onClick={onBack} className="font-bold">Volver</Button>
          <Button 
            className="flex-1 font-black h-12 shadow-lg shadow-primary/20 rounded-xl"
            disabled={!selectedTime}
            onClick={() => onSelect(format(selectedDate, 'yyyy-MM-dd'), selectedTime!)}
          >
            Continuar <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
