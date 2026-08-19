'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, AlertCircle, Check } from "lucide-react";
import { format, isPast, isToday, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from "date-fns";
import { es } from "date-fns/locale";
import type { BookingService, BookingStaff, BookingAvailability, Reservation } from "@/models/booking";
import { calculateEndTime, isSlotAvailable, generateAvailableSlots } from "@/lib/booking-engine";
import { cn } from "@/lib/utils";

interface TimeStepProps {
  selectedService: BookingService;
  selectedStaff: BookingStaff | null;
  availabilityList: BookingAvailability[];
  existingReservations: Reservation[];
  onSelectDateTime: (data: { date: string; startTime: string; endTime: string }) => void;
  onBack: () => void;
}

export function TimeStep({ 
  selectedService, 
  selectedStaff, 
  availabilityList, 
  existingReservations, 
  onSelectDateTime, 
  onBack 
}: TimeStepProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Generar días del mes actual para el calendario
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Obtener turnos disponibles para el día seleccionado
  const availableSlots = useMemo(() => {
    const dayOfWeek = getDay(selectedDate);
    const dayConfig = availabilityList.find(a => a.dayOfWeek === dayOfWeek);
    
    if (!dayConfig || !dayConfig.isOpen) return [];

    return generateAvailableSlots(
      dayConfig,
      selectedService.durationMinutes,
      existingReservations.filter(r => isSameDay(new Date(r.date + 'T00:00:00'), selectedDate)),
      selectedDate
    );
  }, [selectedDate, availabilityList, existingReservations, selectedService.durationMinutes]);

  const handleConfirm = () => {
    if (selectedTime) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      onSelectDateTime({
        date: dateStr,
        startTime: selectedTime,
        endTime: calculateEndTime(selectedTime, selectedService.durationMinutes)
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="relative text-center space-y-2">
        <Button variant="ghost" size="icon" onClick={onBack} className="absolute left-0 top-0 h-10 w-10 rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-2xl font-black text-gray-900">¿Cuándo vienes?</h2>
        <p className="text-muted-foreground">Selecciona la fecha y hora que mejor te convenga.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start max-w-4xl mx-auto">
        {/* Calendario */}
        <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-primary/5 border-b pb-4">
            <div className="flex items-center justify-between">
              <span className="font-black text-sm uppercase tracking-widest text-primary">
                {format(currentMonth, 'MMMM yyyy', { locale: es })}
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} disabled={isPast(startOfMonth(currentMonth))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                <span key={i} className="text-[10px] font-black text-muted-foreground py-2">{d}</span>
              ))}
              {daysInMonth.map((day, i) => {
                const isSelected = isSameDay(day, selectedDate);
                const isPastDay = isPast(day) && !isToday(day);
                const dayOfWeek = getDay(day);
                const isClosed = !availabilityList.find(a => a.dayOfWeek === dayOfWeek)?.isOpen;

                return (
                  <button
                    key={i}
                    disabled={isPastDay || isClosed}
                    onClick={() => { setSelectedDate(day); setSelectedTime(null); }}
                    className={cn(
                      "aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all relative",
                      isSelected ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110 z-10" : 
                      isPastDay || isClosed ? "text-muted-foreground/30 cursor-not-allowed" : "hover:bg-primary/10 text-gray-700"
                    )}
                  >
                    {format(day, 'd')}
                    {isToday(day) && !isSelected && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Turnos */}
        <div className="space-y-4">
           <div className="flex items-center gap-2 px-1">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-black text-xs uppercase tracking-widest text-gray-500">Horarios Disponibles</span>
           </div>
           
           <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {availableSlots.length > 0 ? (
                availableSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={cn(
                      "h-12 rounded-xl text-sm font-bold border-2 transition-all",
                      selectedTime === time 
                        ? "bg-primary border-primary text-white shadow-md scale-105" 
                        : "bg-white border-gray-100 hover:border-primary/30 text-gray-700"
                    )}
                  >
                    {time}
                  </button>
                ))
              ) : (
                <div className="col-span-full py-12 flex flex-col items-center justify-center text-center bg-white rounded-3xl border-2 border-dashed gap-3">
                   <AlertCircle className="h-8 w-8 text-muted-foreground opacity-20" />
                   <p className="text-sm font-medium text-muted-foreground max-w-[200px]">No hay turnos disponibles para este día.</p>
                </div>
              )}
           </div>

           {selectedTime && (
             <Button 
                className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/20 animate-in fade-in slide-in-from-bottom-2"
                onClick={handleConfirm}
             >
                Confirmar para las {selectedTime} <ChevronRight className="ml-2 h-5 w-5" />
             </Button>
           )}
        </div>
      </div>
    </div>
  );
}

function ArrowLeft(props: any) {
  return <ChevronLeft {...props} />
}

export default TimeStep;
