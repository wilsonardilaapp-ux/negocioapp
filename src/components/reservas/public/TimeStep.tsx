'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { 
  Clock, 
  Calendar as CalendarIcon, 
  ChevronRight, 
  AlertCircle,
  CheckCircle2,
  ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isPast, isToday, format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { BookingService, BookingStaff, BookingAvailability, Reservation } from '@/models/booking';
import { generateTimeSlots, isSlotAvailable, calculateEndTime } from '@/lib/booking-engine';

interface TimeStepProps {
  businessId: string;
  selectedService: BookingService;
  selectedStaff: BookingStaff;
  availabilityList: BookingAvailability[];
  existingReservations: Reservation[];
  onSelectDateTime: (data: { date: string; startTime: string; endTime: string }) => void;
  onBack: () => void;
}

/**
 * Función utilitaria para obtener YYYY-MM-DD local sin desfase de zona horaria
 */
const formatToDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function TimeStep({ 
  businessId, 
  selectedService, 
  selectedStaff, 
  availabilityList, 
  existingReservations,
  onSelectDateTime,
  onBack 
}: TimeStepProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [month, setMonth] = useState<Date>(new Date());

  // --- LÓGICA DE TURNOS ---
  const availableSlots = useMemo(() => {
    if (!selectedDate || !availabilityList) return [];

    const dayOfWeek = selectedDate.getDay();
    const dayConfig = availabilityList.find(a => Number(a.dayOfWeek) === dayOfWeek);
    
    // Fallback: Si no hay configuración, Lunes a Sábado abierto (8-18), Domingo cerrado
    const isDayOpen = dayConfig !== undefined ? Boolean(dayConfig.isOpen) : dayOfWeek !== 0;

    if (!isDayOpen) return [];

    const effectiveShifts = (dayConfig?.shifts && dayConfig.shifts.length > 0)
      ? dayConfig.shifts
      : [{ start: '08:00', end: '18:00' }];

    const dayStr = formatToDateString(selectedDate);
    const dayReservations = existingReservations.filter(r => r.date === dayStr && r.staffId === selectedStaff.id);

    const allSlots = generateTimeSlots(15);
    
    return allSlots.filter(startTime => {
      const endTime = calculateEndTime(startTime, selectedService.durationMinutes);
      return isSlotAvailable(
        { start: startTime, end: endTime },
        { ...dayConfig, isOpen: true, shifts: effectiveShifts, dayOfWeek } as BookingAvailability,
        dayReservations
      ).available;
    });
  }, [selectedDate, availabilityList, existingReservations, selectedStaff.id, selectedService.durationMinutes]);

  const handleContinue = () => {
    if (selectedDate && selectedTime) {
      onSelectDateTime({
        date: formatToDateString(selectedDate),
        startTime: selectedTime,
        endTime: calculateEndTime(selectedTime, selectedService.durationMinutes)
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Calendario */}
      <Card className="lg:col-span-2 rounded-[2rem] border-none shadow-xl shadow-gray-100/50 bg-white overflow-hidden">
        <CardHeader className="bg-primary/5 border-b pb-6">
          <CardTitle className="text-xl font-black text-gray-900 flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            1. Selecciona el día
          </CardTitle>
          <CardDescription>Explora las fechas disponibles para tu cita.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              setSelectedDate(date);
              setSelectedTime(null);
            }}
            month={month}
            onMonthChange={setMonth}
            locale={es}
            disabled={(date) => isPast(date) && !isToday(date)}
            className="w-full flex justify-center"
            classNames={{
              day_selected: "bg-primary text-white font-black hover:bg-primary hover:text-white rounded-xl shadow-lg shadow-primary/20",
              day_today: "bg-muted text-primary font-bold rounded-xl",
              day: "h-12 w-12 md:h-14 md:w-14 text-sm font-medium hover:bg-muted hover:rounded-xl transition-all",
              head_cell: "text-muted-foreground font-bold uppercase text-[10px] tracking-widest pb-4",
              nav_button: "hover:bg-primary/10 rounded-lg p-1 text-primary",
            }}
          />
        </CardContent>
      </Card>

      {/* Horas */}
      <div className="space-y-6">
        <Card className="rounded-[2rem] border-none shadow-xl shadow-gray-100/50 bg-white overflow-hidden">
          <CardHeader className="bg-primary/5 border-b pb-6">
            <CardTitle className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              2. Horarios
            </CardTitle>
            <CardDescription>
              {selectedDate 
                ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: es }) 
                : 'Selecciona un día'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {availableSlots.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {availableSlots.map((slot) => (
                  <Button
                    key={slot}
                    variant={selectedTime === slot ? "default" : "outline"}
                    onClick={() => setSelectedTime(slot)}
                    className={cn(
                      "h-12 font-bold rounded-xl transition-all",
                      selectedTime === slot 
                        ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" 
                        : "hover:border-primary hover:text-primary hover:bg-primary/5"
                    )}
                  >
                    {slot}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-3 bg-muted/20 rounded-2xl border border-dashed">
                <AlertCircle className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-4">
                  {selectedDate ? 'No hay turnos disponibles para este día' : 'Selecciona un día del calendario'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acciones */}
        <div className="flex flex-col gap-3">
          <Button 
            size="lg" 
            className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/10"
            disabled={!selectedDate || !selectedTime}
            onClick={handleContinue}
          >
            Continuar al registro
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
          <Button variant="ghost" className="font-bold text-muted-foreground" onClick={onBack}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Volver a profesionales
          </Button>
        </div>
      </div>
    </div>
  );
}
