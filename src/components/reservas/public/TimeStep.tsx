'use client';

import React, { useState, useMemo } from "react";
import {
  format,
  isPast,
  isToday,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay
} from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Check,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateEndTime, generateAvailableSlots } from "@/lib/booking-engine";
import type { BookingService, BookingStaff, BookingAvailability, Reservation } from "@/models/booking";
import { DialogFooter } from "@/components/ui/dialog";

interface TimeStepProps {
  selectedService: BookingService | null;
  selectedStaff: any; // Puede ser BookingStaff o { id: 'any' }
  availabilityList: BookingAvailability[];
  existingReservations: Reservation[];
  onSelectDateTime: (data: { date: string; startTime: string; endTime: string }) => void;
  onBack: () => void;
}

export default function TimeStep({
  selectedService,
  selectedStaff,
  availabilityList,
  existingReservations,
  onSelectDateTime,
  onBack
}: TimeStepProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isCheckingSlots, setIsCheckingSlots] = useState(false);

  // Utilidad para obtener YYYY-MM-DD local sin desfases
  const formatToDateString = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Obtener configuración de disponibilidad para el día seleccionado
  const dayConfig = useMemo(() => {
    if (!selectedDate) return null;
    const dayOfWeek = getDay(selectedDate);
    return availabilityList.find(a => a.dayOfWeek === dayOfWeek);
  }, [selectedDate, availabilityList]);

  // Calcular turnos disponibles
  const availableSlots = useMemo(() => {
    if (!selectedDate || !dayConfig || !selectedService) return [];

    const staffId = selectedStaff?.id || 'any';
    const dateStr = formatToDateString(selectedDate);
    
    // Filtrar citas existentes para este día y profesional
    const dailyReservations = existingReservations.filter(r => 
      r.date === dateStr && 
      (staffId === 'any' || r.staffId === staffId)
    );

    return generateAvailableSlots(
      dayConfig,
      selectedService.durationMinutes,
      dailyReservations,
      selectedDate
    );
  }, [selectedDate, dayConfig, selectedService, selectedStaff?.id, existingReservations]);

  // Lógica de renderizado del calendario
  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const firstDayOfMonth = getDay(startOfMonth(currentMonth));
  const blanks = Array.from({ length: firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 });

  const handleContinue = () => {
    if (selectedDate && selectedTime && selectedService) {
      onSelectDateTime({
        date: formatToDateString(selectedDate),
        startTime: selectedTime,
        endTime: calculateEndTime(selectedTime, selectedService.durationMinutes)
      });
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 sm:p-8 max-w-4xl mx-auto relative animate-in fade-in duration-500">
      {/* Botón Volver */}
      <button
        onClick={onBack}
        className="absolute left-6 top-6 p-2 rounded-full hover:bg-muted/50 text-gray-500 hover:text-gray-900 transition-colors"
        aria-label="Volver"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">Selecciona Fecha y Hora</h2>
        <p className="text-sm text-muted-foreground">Consulta la disponibilidad en tiempo real.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Lado Izquierdo: Calendario */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2 mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            <CalendarIcon className="h-4 w-4 text-primary" /> Escoge un día
          </Label>

          <div className="border rounded-2xl p-4 bg-muted/5">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold capitalize">{format(currentMonth, 'MMMM yyyy', { locale: es })}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} disabled={isPast(startOfMonth(currentMonth))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'].map(d => (
                <span key={d} className="text-[10px] font-black text-muted-foreground">{d}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {blanks.map((_, i) => <div key={`blank-${i}`} />)}
              {days.map(day => {
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const disabled = (isPast(day) && !isToday(day)) || !availabilityList.find(a => a.dayOfWeek === getDay(day))?.isOpen;

                return (
                  <button
                    key={day.toISOString()}
                    disabled={disabled}
                    onClick={() => { setSelectedDate(day); setSelectedTime(null); }}
                    className={cn(
                      "h-10 w-full rounded-xl text-sm font-bold transition-all flex items-center justify-center relative",
                      isSelected ? "bg-primary text-white shadow-md scale-110 z-10" : 
                      disabled ? "text-muted-foreground/30 cursor-not-allowed" : "hover:bg-primary/10 text-gray-700"
                    )}
                  >
                    {format(day, 'd')}
                    {!disabled && !isSelected && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary/40" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Lado Derecho: Horas */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2 mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            <Clock className="h-4 w-4 text-primary" /> Turnos disponibles
          </Label>

          {!selectedDate ? (
            <div className="h-64 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-6 text-muted-foreground bg-muted/5">
              <CalendarIcon className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-xs font-medium">Selecciona una fecha en el calendario para ver los horarios.</p>
            </div>
          ) : isCheckingSlots ? (
            <div className="h-64 flex flex-col items-center justify-center text-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Buscando espacios libres...</p>
            </div>
          ) : availableSlots.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 h-64 overflow-y-auto pr-2 custom-scrollbar">
              {availableSlots.map(time => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={cn(
                    "h-11 rounded-xl text-sm font-bold transition-all border-2",
                    selectedTime === time ? "bg-primary border-primary text-white shadow-md" : "bg-white border-gray-100 hover:border-primary/30 text-gray-700"
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
          ) : (
            <div className="h-64 border-2 border-dashed border-orange-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-orange-800 bg-orange-50/50">
              <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs font-bold">No hay turnos disponibles para este día.</p>
              <p className="text-[10px] opacity-70 mt-1">Intenta con otra fecha o profesional.</p>
            </div>
          )}
        </div>
      </div>

      <DialogFooter className="mt-10 pt-6 border-t flex items-center justify-between">
        <div className="hidden sm:block">
            {selectedDate && selectedTime && (
                <p className="text-sm font-medium text-gray-500">
                    Seleccionado: <span className="text-gray-900 font-bold">{format(selectedDate, 'd MMM')} • {selectedTime}</span>
                </p>
            )}
        </div>
        <Button
          size="lg"
          disabled={!selectedDate || !selectedTime}
          onClick={handleContinue}
          className="w-full sm:w-auto px-12 h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 transition-transform active:scale-95"
        >
          Continuar
          <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </DialogFooter>
    </div>
  );
}
