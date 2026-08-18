'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
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
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';
import { cn } from "@/lib/utils";
import type { BookingAvailability } from '@/models/booking';

interface TimeStepProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  selectedTime: string;
  onTimeSelect: (time: string) => void;
  slots: string[];
  isChecking: boolean;
  availabilityList: BookingAvailability[];
}

export function TimeStep({
  selectedDate,
  onDateSelect,
  selectedTime,
  onTimeSelect,
  slots,
  isChecking,
  availabilityList,
}: TimeStepProps) {
  // Estado para la navegación del calendario (independiente de la fecha seleccionada)
  const [viewMonth, setViewMonth] = useState(startOfMonth(selectedDate));

  // Generar los días del mes actual para la vista
  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(viewMonth),
      end: endOfMonth(viewMonth),
    });
  }, [viewMonth]);

  // Verificar si el día de la semana tiene atención (normalizando tipos)
  const isDayAvailable = (date: Date) => {
    const dayIndex = date.getDay();
    const avail = availabilityList.find(a => Number(a.dayOfWeek) === dayIndex);
    return avail?.isOpen ?? false;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
      {/* Columna Izquierda: Calendario Dinámico */}
      <Card className="rounded-[2rem] border-none shadow-xl bg-white overflow-hidden">
        <CardHeader className="bg-primary/5 border-b pb-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Selecciona Fecha
            </CardTitle>
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm border">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                disabled={isSameDay(viewMonth, startOfMonth(new Date()))}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-[10px] font-black uppercase px-2 min-w-[110px] text-center tracking-widest">
                {format(viewMonth, 'MMMM yyyy', { locale: es })}
              </span>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-7 gap-2">
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
              <div key={i} className="text-center text-[10px] font-black text-muted-foreground uppercase py-2">
                {d}
              </div>
            ))}
            {daysInMonth.map((date) => {
              const available = isDayAvailable(date);
              const isSelected = isSameDay(date, selectedDate);
              const isToday = isSameDay(date, new Date());
              const isPastDay = isPast(date) && !isToday;

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => !isPastDay && available && onDateSelect(date)}
                  disabled={isPastDay || !available}
                  className={cn(
                    "aspect-square flex flex-col items-center justify-center rounded-2xl text-sm font-bold transition-all relative",
                    isSelected ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" :
                    available && !isPastDay ? "bg-white border-2 border-gray-50 hover:border-primary/20 hover:bg-primary/5 text-gray-900" :
                    "bg-muted/10 text-muted-foreground opacity-30 cursor-not-allowed"
                  )}
                >
                  {format(date, 'd')}
                  {available && !isPastDay && !isSelected && (
                    <div className="absolute bottom-1.5 h-1 w-1 rounded-full bg-primary/40" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Columna Derecha: Selector de Horas */}
      <Card className="rounded-[2rem] border-none shadow-xl bg-white overflow-hidden flex flex-col">
        <CardHeader className="bg-primary/5 border-b pb-6">
          <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Turnos Disponibles
          </CardTitle>
          <CardDescription className="text-[10px] font-black text-primary/70 uppercase tracking-widest">
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 flex-1">
          {isChecking ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-muted-foreground">Buscando espacios...</p>
            </div>
          ) : slots.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {slots.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => onTimeSelect(time)}
                  className={cn(
                    "h-12 rounded-xl text-sm font-black transition-all border-2",
                    selectedTime === time
                      ? "bg-primary border-primary text-white shadow-md scale-105"
                      : "bg-white border-gray-100 text-gray-700 hover:border-primary/30 hover:bg-primary/5"
                  )}
                >
                  {time}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4 bg-muted/20 rounded-3xl border-2 border-dashed">
              <div className="p-3 bg-white rounded-2xl shadow-sm">
                <AlertCircle className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-gray-600">Sin turnos para este día</p>
                <p className="text-xs text-muted-foreground px-6">
                  Intenta seleccionando otra fecha o profesional.
                </p>
              </div>
            </div>
          )}
        </CardContent>
        {selectedTime && !isChecking && (
           <CardFooter className="bg-primary/5 p-6 border-t animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-3 w-full">
                 <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-md">
                    <Check className="h-5 w-5" />
                 </div>
                 <div className="flex-1">
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">Hora seleccionada</p>
                    <p className="text-lg font-black text-gray-900 leading-none">{selectedTime}</p>
                 </div>
              </div>
           </CardFooter>
        )}
      </Card>
    </div>
  );
}
