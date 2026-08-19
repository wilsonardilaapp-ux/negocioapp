'use client';

import { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { format, isPast, isToday, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { generateAvailableSlots } from '@/lib/booking-engine';
import type { BookingService, BookingStaff, BookingAvailability, Reservation } from '@/models/booking';
import { cn } from '@/lib/utils';

interface TimeStepProps {
  businessId: string;
  selectedService?: BookingService;
  selectedStaff?: BookingStaff;
  onSelectDateTime: (data: { date: string; startTime: string; endTime: string }) => void;
  onBack: () => void;
}

export function TimeStep({ businessId, selectedService, selectedStaff, onSelectDateTime, onBack }: TimeStepProps) {
  const firestore = useFirestore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // --- DATA FETCHING ---
  const availabilityQuery = useMemoFirebase(() => query(collection(firestore, `businesses/${businessId}/bookingAvailability`)), [businessId, firestore]);
  const resQuery = useMemoFirebase(() => {
    if (!selectedDate) return null;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const base = collection(firestore, `businesses/${businessId}/reservations`);
    return selectedStaff ? query(base, where('date', '==', dateStr), where('staffId', '==', selectedStaff.id)) : query(base, where('date', '==', dateStr));
  }, [businessId, firestore, selectedDate, selectedStaff?.id]);

  const { data: availabilityList } = useCollection<BookingAvailability>(availabilityQuery);
  const { data: existingReservations } = useCollection<Reservation>(resQuery);

  // Generar días del mes actual
  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Función utilitaria segura para obtener YYYY-MM-DD local (evita UTC issues)
  const formatToDateString = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calcular turnos disponibles para el día seleccionado
  const availableSlots = useMemo(() => {
    if (!selectedDate || !availabilityList || !selectedService) return [];
    
    const dayOfWeek = getDay(selectedDate);
    const dayConfig = availabilityList.find(a => a.dayOfWeek === dayOfWeek);
    
    if (!dayConfig || !dayConfig.isOpen) return [];

    return generateAvailableSlots(
      dayConfig, 
      selectedService.durationMinutes, 
      existingReservations || [], 
      selectedDate
    );
  }, [selectedDate, availabilityList, existingReservations, selectedService, selectedStaff?.id]);

  const handleContinue = () => {
    if (selectedDate && selectedTime && selectedService) {
      const dateStr = formatToDateString(selectedDate);
      onSelectDateTime({
        date: dateStr,
        startTime: selectedTime,
        endTime: "" // Se calcula en el wizard o server action
      });
    }
  };

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 sm:p-8 max-w-4xl mx-auto relative">
      <button onClick={onBack} className="absolute left-6 top-6 p-2 rounded-full hover:bg-muted/50 text-gray-500 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
      
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-gray-900">Agenda tu cita</h2>
        <p className="text-sm text-muted-foreground">Selecciona la fecha y hora que más te convenga.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Calendario */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" /> Escoge un día
            </Label>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm font-bold capitalize w-24 text-center">{format(currentMonth, 'MMMM yyyy', { locale: es })}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(d => <span key={d} className="text-[10px] font-bold text-gray-400">{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, i) => {
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const disabled = (isPast(day) && !isToday(day));
              const dayConfig = availabilityList?.find(a => a.dayOfWeek === getDay(day));
              const isClosed = dayConfig && !dayConfig.isOpen;

              return (
                <button
                  key={i}
                  disabled={disabled || isClosed}
                  onClick={() => { setSelectedDate(day); setSelectedTime(null); }}
                  className={cn(
                    "h-10 w-full rounded-xl text-sm font-bold transition-all flex items-center justify-center",
                    isSelected ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110 z-10" : 
                    (disabled || isClosed) ? "text-gray-200 cursor-not-allowed" : "hover:bg-primary/10 hover:text-primary"
                  )}
                  style={i === 0 ? { gridColumnStart: getDay(days[0]) + 1 } : {}}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Turnos */}
        <div className="space-y-4">
          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Turnos disponibles
          </Label>

          {selectedDate ? (
            availableSlots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-2">
                {availableSlots.map(time => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={cn(
                      "py-3 rounded-xl text-xs font-bold transition-all border-2",
                      selectedTime === time ? "border-primary bg-primary text-white" : "border-gray-100 hover:border-primary/20 bg-muted/20"
                    )}
                  >
                    {time}
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center bg-muted/20 rounded-3xl border-2 border-dashed">
                <p className="text-sm font-medium text-muted-foreground">No hay turnos para este día.</p>
              </div>
            )
          ) : (
            <div className="py-12 text-center bg-muted/20 rounded-3xl border-2 border-dashed">
              <p className="text-sm font-medium text-muted-foreground">Selecciona una fecha primero.</p>
            </div>
          )}
        </div>
      </div>

      <div className="pt-8 border-t flex justify-end">
        <Button 
          onClick={handleContinue} 
          disabled={!selectedTime}
          className="font-black px-12 h-12 rounded-xl shadow-lg"
        >
          Continuar <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default TimeStep;
