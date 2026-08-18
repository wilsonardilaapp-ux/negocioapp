'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isPast, 
  isToday, 
  getDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { calculateEndTime, isSlotAvailable, generateTimeSlots } from "@/lib/booking-engine";
import type { BookingService, BookingStaff, BookingAvailability, Reservation, TimeRange } from "@/models/booking";

interface TimeStepProps {
  businessId: string;
  selectedService: BookingService;
  selectedStaff: BookingStaff | null;
  selectedDate: Date | null;
  selectedTime: string | null;
  onDateSelect: (date: Date) => void;
  onTimeSelect: (time: string) => void;
  availabilityList: BookingAvailability[] | null;
  existingReservations: Reservation[] | null;
}

export function TimeStep({
  businessId,
  selectedService,
  selectedStaff,
  selectedDate,
  selectedTime,
  onDateSelect,
  onTimeSelect,
  availabilityList,
  existingReservations
}: TimeStepProps) {
  const [viewMonth, setViewMonth] = useState<Date>(new Date());

  // Funciones de navegación de meses
  const handlePrevMonth = () => setViewMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setViewMonth(prev => addMonths(prev, 1));

  // Generar días del mes actual para el grid
  const days = useMemo(() => {
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  // --- MOTOR DE GENERACIÓN DE HORARIOS (SLOTS) ---
  const availableSlots = useMemo(() => {
    if (!selectedDate) return [];

    const dayOfWeekIndex = getDay(selectedDate);
    const dayConfig = availabilityList?.find(a => Number(a.dayOfWeek) === dayOfWeekIndex);

    // LOGICA CORREGIDA: Si no hay config, asumimos abierto L-S (Abierto por Defecto)
    const isDayOpen = dayConfig !== undefined ? dayConfig.isOpen : dayOfWeekIndex !== 0;
    if (!isDayOpen) return [];

    // FALLBACK DE HORARIOS: Si no hay turnos guardados, usamos 08:00 - 18:00
    const effectiveShifts: TimeRange[] = (dayConfig?.shifts && dayConfig.shifts.length > 0)
      ? dayConfig.shifts
      : [{ start: '08:00', end: '18:00' }];

    const effectiveBreaks: TimeRange[] = dayConfig?.breaks || [];
    
    // Generar slots base cada 15 min
    const allPossibleSlots = generateTimeSlots(15);
    
    const now = new Date();
    const isSelectedToday = isToday(selectedDate);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // Filtrar reservas existentes para el profesional seleccionado
    const relevantReservations = (existingReservations || []).filter(r => {
      if (!selectedStaff || selectedStaff.id === 'any') return true;
      return r.staffId === selectedStaff.id;
    });

    return allPossibleSlots.filter(startTime => {
      const duration = selectedService.durationMinutes || 30;
      const endTime = calculateEndTime(startTime, duration);
      
      // 1. Validar si es hoy y el tiempo ya pasó (+30 min de margen)
      if (isSelectedToday) {
        const [h, m] = startTime.split(':').map(Number);
        if (h * 60 + m <= nowMinutes + 30) return false;
      }

      // 2. Validar contra el motor de colisiones (Jornada, Descansos, Ocupación)
      const check = isSlotAvailable(
        { start: startTime, end: endTime },
        { 
            dayOfWeek: dayOfWeekIndex, 
            isOpen: true, 
            shifts: effectiveShifts, 
            breaks: effectiveBreaks 
        },
        relevantReservations
      );

      return check.available;
    });
  }, [selectedDate, availabilityList, existingReservations, selectedService, selectedStaff]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* COLUMNA IZQUIERDA: CALENDARIO */}
      <Card className="rounded-[2rem] border-none shadow-xl bg-white overflow-hidden">
        <CardHeader className="bg-primary/5 border-b pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm border border-primary/20">
                <CalendarIcon className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl font-black tracking-tight uppercase">
                {format(viewMonth, 'MMMM yyyy', { locale: es })}
              </CardTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="rounded-full hover:bg-primary/10">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleNextMonth} className="rounded-full hover:bg-primary/10">
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-7 gap-2">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(dayName => (
              <div key={dayName} className="text-center text-[10px] font-black uppercase text-muted-foreground py-2 tracking-widest">
                {dayName}
              </div>
            ))}
            {days.map((day, i) => {
              const dayOfWeek = getDay(day);
              const dayConfig = availabilityList?.find(a => Number(a.dayOfWeek) === dayOfWeek);
              
              // LOGICA DE DISPONIBILIDAD: Fallback dinámico si no hay configuración
              const isDayOpen = dayConfig !== undefined ? dayConfig.isOpen : dayOfWeek !== 0;
              const isPastDate = isPast(day) && !isToday(day);
              const isDisabled = !isDayOpen || isPastDate;
              const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');

              return (
                <button
                  key={i}
                  disabled={isDisabled}
                  onClick={() => onDateSelect(day)}
                  className={cn(
                    "relative aspect-square flex flex-col items-center justify-center rounded-2xl text-sm font-bold transition-all border-2",
                    isDisabled 
                      ? "bg-muted/30 text-gray-300 border-transparent cursor-not-allowed opacity-50" 
                      : isSelected
                        ? "bg-primary text-white border-primary shadow-lg scale-105 z-10"
                        : "bg-white border-gray-50 text-gray-700 hover:border-primary/30 hover:bg-primary/5"
                  )}
                >
                  {format(day, 'd')}
                  {isSelected && <div className="absolute bottom-1.5 h-1 w-1 bg-white rounded-full"></div>}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* COLUMNA DERECHA: HORAS DISPONIBLES */}
      <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden flex flex-col">
        <CardHeader className="bg-primary/5 border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm border border-primary/20">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-black tracking-tight">Turnos Disponibles</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold text-primary/70 tracking-widest">
                {selectedDate 
                  ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })
                  : "Selecciona un día en el calendario"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-8">
          {!selectedDate ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
              <div className="p-6 bg-muted rounded-full">
                <CalendarIcon className="h-12 w-12" />
              </div>
              <p className="font-bold text-lg">Selecciona un día del calendario para ver las horas</p>
            </div>
          ) : availableSlots.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-in fade-in duration-500">
              {availableSlots.map(time => (
                <button
                  key={time}
                  onClick={() => onTimeSelect(time)}
                  className={cn(
                    "h-14 rounded-2xl font-black text-sm transition-all border-2 flex items-center justify-center gap-2",
                    selectedTime === time
                      ? "bg-primary text-white border-primary shadow-lg scale-105"
                      : "bg-white border-gray-100 text-gray-700 hover:border-primary/20 hover:bg-primary/5"
                  )}
                >
                  {time}
                  {selectedTime === time && <CheckCircle2 className="h-4 w-4" />}
                </button>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
              <div className="p-6 bg-orange-50 rounded-full text-orange-200">
                <AlertCircle className="h-12 w-12" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-orange-900">Sin turnos para este día</p>
                <p className="text-xs text-orange-700/60 max-w-[200px]">Intenta seleccionando otra fecha o profesional.</p>
              </div>
            </div>
          )}
        </CardContent>

        {selectedTime && selectedDate && (
          <CardFooter className="bg-primary/5 p-6 border-t animate-in slide-in-from-bottom-4 duration-300">
            <div className="w-full flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Turno Elegido</span>
                <span className="text-lg font-black text-primary">{selectedTime}</span>
              </div>
              <div className="h-10 w-px bg-primary/10"></div>
              <div className="flex-1 text-xs font-bold text-gray-600 leading-tight">
                Cita programada para el {format(selectedDate, "d 'de' MMM", { locale: es })}
              </div>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}