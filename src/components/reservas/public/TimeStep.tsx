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
  isPast, 
  startOfDay,
  getDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { calculateEndTime, isSlotAvailable, generateTimeSlots, timeToMinutes } from "@/lib/booking-engine";
import type { BookingService, BookingStaff, BookingAvailability, Reservation } from '@/models/booking';

interface TimeStepProps {
  businessId: string;
  selectedService: BookingService;
  selectedStaffId: string;
  availabilityList: BookingAvailability[];
  existingReservations: Reservation[];
  onSelect: (date: string, startTime: string, endTime: string) => void;
  onBack: () => void;
}

export function TimeStep({ 
  businessId, 
  selectedService, 
  selectedStaffId, 
  availabilityList = [], 
  existingReservations = [], 
  onSelect, 
  onBack 
}: TimeStepProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState<Date>(new Date());
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const safeDate = (date: any): Date => {
    if (date instanceof Date && !isNaN(date.getTime())) return date;
    if (typeof date === 'string' || typeof date === 'number') {
      const d = new Date(date);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  };

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const availableSlots = useMemo(() => {
    if (!selectedDate || !selectedService) return [];

    const dayOfWeek = getDay(selectedDate);
    const dayAvail = (availabilityList || []).find(a => Number(a.dayOfWeek) === dayOfWeek);

    if (!dayAvail || !dayAvail.isOpen) return [];

    const slots = generateTimeSlots(15);
    const now = new Date();
    const isToday = isSameDay(selectedDate, now);
    const nowMinutes = timeToMinutes(format(now, 'HH:mm'));

    return slots.filter(startTime => {
      const duration = Number(selectedService?.durationMinutes) || 30;
      
      // Validación defensiva para asegurar que la función existe
      const endTime = typeof calculateEndTime === 'function' 
        ? calculateEndTime(startTime, duration)
        : '00:00';
      
      // Filtro de horas pasadas solo si es hoy
      if (isToday && timeToMinutes(startTime) <= nowMinutes + 30) {
        return false;
      }

      // Validar contra agenda ocupada
      const check = isSlotAvailable(
        { start: startTime, end: endTime },
        dayAvail,
        existingReservations
      );

      return check.available;
    });
  }, [selectedDate, selectedService, availabilityList, existingReservations]);

  const handlePrevMonth = () => setViewMonth(prev => subMonths(safeDate(prev), 1));
  const handleNextMonth = () => setViewMonth(prev => addMonths(safeDate(prev), 1));

  if (!isMounted) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
      {/* Selector de Fecha (Calendario) */}
      <Card className="rounded-[2rem] border-2 border-primary/5 shadow-xl">
        <CardHeader className="bg-primary/5 border-b flex flex-row items-center justify-between p-6">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm"><CalendarIcon className="h-5 w-5 text-primary" /></div>
              <CardTitle className="text-lg font-black uppercase">{format(safeDate(viewMonth), 'MMMM yyyy', { locale: es })}</CardTitle>
           </div>
           <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevMonth} disabled={isPast(startOfMonth(viewMonth))} className="h-9 w-9 rounded-xl"><ChevronLeft className="h-4 w-4"/></Button>
              <Button variant="outline" size="icon" onClick={handleNextMonth} className="h-9 w-9 rounded-xl"><ChevronRight className="h-4 w-4"/></Button>
           </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map(d => (
              <div key={d} className="text-center text-[10px] font-black text-muted-foreground uppercase py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
             {daysInMonth.map((day, i) => {
               const dayIndex = getDay(day);
               const isDayOpen = (availabilityList || []).find(a => Number(a.dayOfWeek) === dayIndex)?.isOpen;
               const isSelectable = !isPast(startOfDay(day)) && isDayOpen;
               const isSelected = selectedDate && isSameDay(day, selectedDate);

               return (
                 <button
                   key={i}
                   type="button"
                   disabled={!isSelectable}
                   onClick={() => { setSelectedDate(day); setSelectedTime(null); }}
                   className={cn(
                     "aspect-square flex flex-col items-center justify-center rounded-2xl text-sm font-bold transition-all relative",
                     isSelected ? "bg-primary text-white shadow-lg scale-110 z-10" : 
                     isSelectable ? "bg-white border-2 border-gray-50 text-gray-900 hover:border-primary/30" : "text-muted-foreground/30 cursor-not-allowed"
                   )}
                 >
                   {format(day, 'd')}
                   {isSelectable && !isSelected && <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-primary/40"></div>}
                 </button>
               );
             })}
          </div>
        </CardContent>
      </Card>

      {/* Selector de Hora */}
      <Card className="rounded-[2.5rem] border-2 border-primary/5 shadow-xl flex flex-col overflow-hidden">
        <CardHeader className="bg-muted/30 border-b p-6">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm"><Clock className="h-5 w-5 text-primary" /></div>
              <div>
                <CardTitle className="text-lg">Turnos Disponibles</CardTitle>
                {selectedDate && <CardDescription className="text-xs font-bold text-primary">{format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}</CardDescription>}
              </div>
           </div>
        </CardHeader>
        <CardContent className="p-6 flex-1 overflow-y-auto max-h-[400px]">
           {!selectedDate ? (
             <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                <CalendarIcon className="h-12 w-12 mb-4" />
                <p className="font-bold">Selecciona un día del calendario</p>
             </div>
           ) : availableSlots.length > 0 ? (
             <div className="grid grid-cols-3 gap-3">
                {availableSlots.map(time => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setSelectedTime(time)}
                    className={cn(
                      "py-3 rounded-2xl text-sm font-black transition-all border-2",
                      selectedTime === time ? "bg-primary border-primary text-white shadow-md scale-105" : "bg-white border-gray-100 text-gray-700 hover:border-primary/20"
                    )}
                  >
                    {time}
                  </button>
                ))}
             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                <div className="p-4 bg-orange-50 rounded-full"><AlertCircle className="h-8 w-8 text-orange-400" /></div>
                <div className="space-y-1">
                  <p className="font-black text-gray-900">Sin turnos para este día</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">Intenta seleccionando otra fecha o profesional.</p>
                </div>
             </div>
           )}
        </CardContent>
        <CardFooter className="p-6 bg-muted/20 border-t flex gap-3">
            <Button variant="ghost" onClick={onBack} className="font-bold">Atrás</Button>
            <Button 
              className="flex-1 font-black shadow-lg" 
              disabled={!selectedDate || !selectedTime}
              onClick={() => {
                const duration = Number(selectedService.durationMinutes) || 30;
                const endTime = calculateEndTime(selectedTime!, duration);
                onSelect(format(selectedDate!, 'yyyy-MM-dd'), selectedTime!, endTime);
              }}
            >
              Continuar <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
