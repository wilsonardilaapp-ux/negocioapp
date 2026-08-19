'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, Loader2, ChevronRight, Info, ArrowLeft, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateEndTime, isSlotAvailable, generateTimeSlots } from '@/lib/booking-engine';
import type { BookingService, BookingStaff, BookingAvailability, Reservation } from '@/models/booking';
import { Label } from '@/components/ui/label';

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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Helper para obtener el string YYYY-MM-DD local
  const formatToDateString = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Cálculo de turnos disponibles
  const availableSlots = useMemo(() => {
    if (!selectedDate) return [];

    const dateStr = formatToDateString(selectedDate);
    const dayOfWeek = selectedDate.getDay();
    
    // PROTECCIÓN DEFENSIVA: Extracción segura de variables con fallbacks
    const currentStaffId = selectedStaff?.id || 'any';
    const currentDuration = Number(selectedService?.durationMinutes) || 30;

    const dayConfig = availabilityList?.find(a => Number(a.dayOfWeek) === dayOfWeek);

    // Fallback: Si no hay config, asumimos abierto L-S 08:00-18:00
    const isDayOpen = dayConfig !== undefined ? Boolean(dayConfig.isOpen) : dayOfWeek !== 0;
    
    if (!isDayOpen) return [];

    const effectiveShifts = (dayConfig?.shifts && dayConfig.shifts.length > 0)
      ? dayConfig.shifts
      : [{ start: '08:00', end: '18:00' }];

    const dailyReservations = existingReservations?.filter(r => 
      r.date === dateStr && (currentStaffId === 'any' || r.staffId === currentStaffId)
    ) || [];

    const allSlots = generateTimeSlots(15);
    
    return allSlots.filter(time => {
      const endTime = calculateEndTime(time, currentDuration);
      return isSlotAvailable(
        { start: time, end: endTime },
        { ...dayConfig, isOpen: true, shifts: effectiveShifts, dayOfWeek } as any,
        dailyReservations
      ).available;
    });

  // LÍNEA 83: Protección con encadenamiento opcional en dependencias
  }, [
    selectedDate, 
    availabilityList, 
    existingReservations, 
    selectedStaff?.id, 
    selectedService?.id, 
    selectedService?.durationMinutes
  ]);

  const handleContinue = () => {
    if (selectedDate && selectedTime) {
      onSelectDateTime({
        date: formatToDateString(selectedDate),
        startTime: selectedTime,
        endTime: calculateEndTime(selectedTime, Number(selectedService?.durationMinutes) || 30)
      });
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 sm:p-8 max-w-4xl mx-auto relative animate-in fade-in duration-500">
      <button
        onClick={onBack}
        className="absolute left-6 top-6 p-2 rounded-full hover:bg-muted/50 text-gray-500 hover:text-gray-900 transition-colors"
        aria-label="Volver"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">Agenda tu Turno</h2>
        <p className="text-sm text-muted-foreground">Selecciona la fecha y hora que mejor te convenga.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">1. Selecciona el día</Label>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
                setSelectedDate(date);
                setSelectedTime(null);
            }}
            locale={es}
            className="rounded-2xl border shadow-sm bg-white"
            disabled={(date) => isPast(date) && !isToday(date)}
          />
        </div>

        <div className="space-y-4 flex flex-col">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">2. Turnos Disponibles</Label>
          
          <div className="flex-1 min-h-[300px] border rounded-2xl p-4 bg-muted/20 overflow-y-auto">
            {!selectedDate ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <CalendarDays className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">Selecciona un día del calendario</p>
              </div>
            ) : availableSlots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {availableSlots.map(time => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "outline"}
                    className={cn(
                      "h-10 font-bold rounded-xl transition-all",
                      selectedTime === time ? "shadow-md scale-105" : "bg-white hover:border-primary/50"
                    )}
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <Clock className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground font-medium">No hay turnos disponibles para este día.</p>
              </div>
            )}
          </div>

          <div className="pt-4">
             <Button 
              className="w-full h-12 font-black rounded-xl shadow-lg shadow-primary/10" 
              disabled={!selectedDate || !selectedTime}
              onClick={handleContinue}
            >
              Continuar <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
            <p className="text-xs font-bold text-primary uppercase tracking-widest">Resumen de selección</p>
            <p className="text-xs text-gray-600 leading-relaxed">
                Has seleccionado a <strong>{selectedStaff?.name || 'Cualquier Profesional'}</strong> para un servicio de <strong>{selectedService?.name || 'Servicio'}</strong>.
            </p>
        </div>
      </div>
    </div>
  );
}