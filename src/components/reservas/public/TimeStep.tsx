'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertCircle,
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
  getDay 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { generateTimeSlots, isSlotAvailable, calculateEndTime, timeToMinutes } from '@/lib/booking-engine';
import type { BookingAvailability, BookingService, BookingStaff, Reservation } from '@/models/booking';

interface TimeStepProps {
  businessId: string;
  selectedService: BookingService;
  selectedStaffId: string;
  availability: BookingAvailability[];
  existingReservations: Reservation[];
  selectedDate: Date | null;
  selectedTime: string | null;
  onDateSelect: (date: Date) => void;
  onTimeSelect: (time: string) => void;
}

export function TimeStep({
  selectedService,
  selectedStaffId,
  availability = [],
  existingReservations = [],
  selectedDate,
  selectedTime,
  onDateSelect,
  onTimeSelect
}: TimeStepProps) {
  
  const [viewMonth, setViewMonth] = useState(new Date());

  const safeDate = (date: any): Date => {
    if (date instanceof Date && !isNaN(date.getTime())) return date;
    const d = new Date(date);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const availableSlots = useMemo(() => {
    if (!selectedDate) return [];

    const dayIndex = getDay(selectedDate);
    const dayAvail = (availability || []).find(a => Number(a.dayOfWeek) === dayIndex);

    if (!dayAvail || !dayAvail.isOpen) return [];

    const slots = generateTimeSlots(15);
    const isToday = isSameDay(new Date(), selectedDate);
    const nowMinutes = timeToMinutes(format(new Date(), 'HH:mm'));

    return slots.filter(startTime => {
      // 1. Margen de 30 min para hoy
      if (isToday && timeToMinutes(startTime) <= nowMinutes + 30) return false;

      // 2. Validación de motor (jornada, descansos, colisiones)
      const endTime = calculateEndTime(startTime, selectedService.durationMinutes);
      
      const reservationsToConsider = selectedStaffId === 'any' 
        ? existingReservations 
        : existingReservations.filter(r => r.staffId === selectedStaffId);

      return isSlotAvailable({ start: startTime, end: endTime }, dayAvail, reservationsToConsider).available;
    });
  }, [selectedDate, availability, existingReservations, selectedService, selectedStaffId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
      {/* CALENDARIO */}
      <Card className="rounded-3xl border-none shadow-xl bg-white overflow-hidden">
        <CardHeader className="bg-primary/5 border-b pb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black tracking-tight capitalize">
              {format(safeDate(viewMonth), 'MMMM yyyy', { locale: es })}
            </h3>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-xl h-9 w-9" 
                onClick={() => setViewMonth(prev => subMonths(safeDate(prev), 1))}
                disabled={isSameDay(startOfMonth(viewMonth), startOfMonth(new Date()))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-xl h-9 w-9" 
                onClick={() => setViewMonth(prev => addMonths(safeDate(prev), 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-7 gap-2 mb-4 text-center">
            {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map(d => (
              <span key={d} className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {/* Offset inicial */}
            {Array.from({ length: getDay(daysInMonth[0]) }).map((_, i) => <div key={`off-${i}`} />)}
            
            {daysInMonth.map(day => {
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isPastDay = isPast(startOfDay(day)) && !isSameDay(day, new Date());
              const dayIndex = getDay(day);
              const isOpen = (availability || []).some(a => Number(a.dayOfWeek) === dayIndex && a.isOpen);

              return (
                <button
                  key={day.toISOString()}
                  disabled={isPastDay || !isOpen}
                  onClick={() => onDateSelect(day)}
                  className={cn(
                    "relative flex flex-col items-center justify-center aspect-square rounded-2xl text-sm font-bold transition-all",
                    isSelected ? "bg-primary text-white shadow-lg scale-110 z-10" : 
                    isOpen && !isPastDay ? "bg-white border-2 border-gray-50 text-gray-900 hover:border-primary/30" :
                    "text-gray-300 cursor-not-allowed opacity-40"
                  )}
                >
                  {format(day, 'd')}
                  {isOpen && !isPastDay && !isSelected && (
                    <div className="absolute bottom-1.5 h-1 w-1 rounded-full bg-primary/40" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* HORARIOS */}
      <Card className="rounded-3xl border-none shadow-xl bg-white overflow-hidden flex flex-col">
        <CardHeader className="bg-muted/30 border-b">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-white rounded-xl shadow-sm"><Clock className="h-5 w-5 text-primary" /></div>
             <div>
                <CardTitle className="text-lg">Horas Disponibles</CardTitle>
                <CardDescription className="text-xs">
                    {selectedDate ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: es }) : 'Selecciona un día'}
                </CardDescription>
             </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 flex-1 overflow-y-auto max-h-[400px]">
          {!selectedDate ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-30">
               <CalendarIcon className="h-12 w-12 mb-4" />
               <p className="font-bold text-sm uppercase tracking-widest">Elige una fecha a la izquierda</p>
            </div>
          ) : availableSlots.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 animate-in fade-in slide-in-from-right-3 duration-500">
                {availableSlots.map(slot => (
                  <button
                    key={slot}
                    onClick={() => onTimeSelect(slot)}
                    className={cn(
                      "h-12 rounded-xl text-sm font-black transition-all border-2",
                      selectedTime === slot 
                        ? "bg-primary text-white border-primary shadow-lg scale-105" 
                        : "bg-white border-gray-100 text-gray-900 hover:border-primary/20"
                    )}
                  >
                    {slot}
                  </button>
                ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 gap-4">
               <div className="p-4 bg-orange-50 rounded-full"><AlertCircle className="h-8 w-8 text-orange-400" /></div>
               <p className="text-sm font-bold text-orange-800/60 max-w-[200px]">Sin turnos para este día. Intenta con otra fecha.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
