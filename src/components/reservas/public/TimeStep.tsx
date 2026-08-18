'use client';

import React, { useState, useMemo } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isSameMonth, 
  isPast, 
  startOfDay,
  getDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateTimeSlots, isSlotAvailable, timeToMinutes } from '@/lib/booking-engine';
import { calculateEndTime, type BookingService, type BookingStaff, type BookingAvailability, type Reservation } from '@/models/booking';

interface TimeStepProps {
  businessId: string;
  selectedService: BookingService;
  selectedStaff: BookingStaff | 'any';
  availability: BookingAvailability[];
  reservations: Reservation[];
  onSelect: (date: string, time: string) => void;
  staffList: BookingStaff[];
}

export function TimeStep({ 
  selectedService, 
  selectedStaff, 
  availability, 
  reservations, 
  onSelect,
  staffList 
}: TimeStepProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // --- GENERACIÓN DEL CALENDARIO ---
  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  const canNavigatePrev = !isSameMonth(currentMonth, new Date());

  // --- LÓGICA DE DISPONIBILIDAD DE TURNOS ---
  const availableSlots = useMemo(() => {
    if (!selectedDate) return [];

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const dayOfWeek = getDay(selectedDate); // 0 (Dom) - 6 (Sab)
    
    // CORRECCIÓN TÉCNICA: Normalización de tipos para encontrar disponibilidad
    const dayAvail = availability.find(a => Number(a.dayOfWeek) === dayOfWeek);
    
    if (!dayAvail || !dayAvail.isOpen) return [];

    // Generar slots base (cada 15 min)
    const baseSlots = generateTimeSlots(15);
    const now = new Date();
    const isToday = isSameDay(selectedDate, now);
    const nowMinutes = timeToMinutes(format(now, 'HH:mm'));

    return baseSlots.filter(startTime => {
      const endTime = calculateEndTime(startTime, selectedService.durationMinutes);
      const proposedRange = { start: startTime, end: endTime };

      // 1. Si es hoy, no permitir turnos en el pasado (+30 min margen)
      if (isToday && timeToMinutes(startTime) <= nowMinutes + 30) return false;

      // 2. Validar contra la jornada y descansos del negocio
      if (!isSlotAvailable(proposedRange, dayAvail, []).available) return false;

      // 3. Validar contra reservas existentes
      if (selectedStaff === 'any') {
        // "Cualquiera": Al menos uno de los profesionales que presten el servicio debe estar libre
        const qualifiedStaff = staffList.filter(s => 
          s.isActive && s.assignedServiceIds.includes(selectedService.id)
        );
        
        return qualifiedStaff.some(staff => {
            const staffRes = reservations.filter(r => r.staffId === staff.id && r.date === dateStr);
            return isSlotAvailable(proposedRange, dayAvail, staffRes).available;
        });
      } else {
        // Específico: Validar solo contra la agenda de ese profesional
        const staffRes = reservations.filter(r => r.staffId === selectedStaff.id && r.date === dateStr);
        return isSlotAvailable(proposedRange, dayAvail, staffRes).available;
      }
    });
  }, [selectedDate, selectedService, selectedStaff, availability, reservations, staffList]);

  const handleDateSelect = (date: Date) => {
    if (isPast(date) && !isSameDay(date, new Date())) return;
    setSelectedDate(date);
    setSelectedTime(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start animate-in fade-in duration-500">
      
      {/* SECCIÓN CALENDARIO (Izquierda) */}
      <Card className="rounded-[2rem] border-none shadow-xl bg-white overflow-hidden">
        <CardHeader className="bg-primary/5 border-b p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-gray-900 capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: es })}
            </h3>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigateMonth('prev')} 
                disabled={!canNavigatePrev}
                className="h-9 w-9 rounded-xl hover:bg-white shadow-sm"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigateMonth('next')}
                className="h-9 w-9 rounded-xl hover:bg-white shadow-sm"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-7 gap-2 mb-4 text-center">
            {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map(d => (
              <span key={d} className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, idx) => {
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const isPastDay = isPast(day) && !isToday;
              const dayOfWeek = getDay(day);
              const isOpen = availability.find(a => Number(a.dayOfWeek) === dayOfWeek)?.isOpen;

              return (
                <button
                  key={idx}
                  onClick={() => handleDateSelect(day)}
                  disabled={isPastDay || !isOpen}
                  className={cn(
                    "relative aspect-square flex flex-col items-center justify-center rounded-2xl text-sm font-bold transition-all border-2",
                    isSelected ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105 z-10" : 
                    isToday ? "border-primary/20 text-primary bg-primary/5" :
                    !isOpen || isPastDay ? "bg-muted/30 border-transparent text-muted-foreground/30 cursor-not-allowed" :
                    "bg-white border-gray-50 text-gray-700 hover:border-primary/20 hover:bg-primary/5"
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

      {/* SECCIÓN HORARIOS (Derecha) */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <Clock className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Horas Disponibles</h3>
        </div>

        {!selectedDate ? (
            <div className="py-20 text-center space-y-4 bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
                <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                    <CalendarIcon className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <p className="text-sm font-medium text-muted-foreground px-10">
                    Selecciona una fecha en el calendario para ver los turnos disponibles.
                </p>
            </div>
        ) : (
            <div className="space-y-6 animate-in slide-in-from-right-2 duration-400">
                {availableSlots.length > 0 ? (
                    <>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                            {availableSlots.map(slot => (
                                <button
                                    key={slot}
                                    onClick={() => setSelectedTime(slot)}
                                    className={cn(
                                        "h-12 rounded-xl text-sm font-black border-2 transition-all active:scale-95",
                                        selectedTime === slot 
                                            ? "bg-primary border-primary text-white shadow-md" 
                                            : "bg-white border-gray-100 text-gray-600 hover:border-primary/20 hover:bg-primary/5"
                                    )}
                                >
                                    {slot}
                                </button>
                            ))}
                        </div>
                        <Button 
                            onClick={() => selectedTime && onSelect(format(selectedDate, 'yyyy-MM-dd'), selectedTime)}
                            disabled={!selectedTime}
                            className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/20"
                        >
                            <CheckCircle2 className="mr-2 h-5 w-5" />
                            Continuar con la reserva
                        </Button>
                    </>
                ) : (
                    <div className="p-10 text-center bg-orange-50 rounded-[2rem] border border-orange-100 space-y-3">
                        <AlertCircle className="h-10 w-10 text-orange-400 mx-auto" />
                        <p className="text-sm font-bold text-orange-800">No hay turnos disponibles para este día</p>
                        <p className="text-xs text-orange-700/70">Intenta con otra fecha o profesional.</p>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}
