'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { 
  ArrowLeft, 
  Clock, 
  Calendar as CalendarIcon, 
  Loader2,
  ChevronRight,
  Info
} from "lucide-react";
import { format, addMonths, subMonths, isBefore, startOfDay, endOfMonth, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { BookingService, BookingStaff, BookingAvailability, Reservation } from '@/models/booking';
import { generateAvailableSlots, calculateEndTime } from '@/lib/booking-engine';
import { cn } from '@/lib/utils';

interface TimeStepProps {
  businessId: string;
  selectedService?: BookingService;
  selectedStaff?: BookingStaff;
  onBack: () => void;
  onSelectDateTime: (data: { date: string; startTime: string; endTime: string }) => void;
}

export function TimeStep({ businessId, selectedService, selectedStaff, onBack, onSelectDateTime }: TimeStepProps) {
  const firestore = useFirestore();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [month, setMonth] = useState<Date>(new Date());

  // --- DATA FETCHING ---
  const availabilityQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, `businesses/${businessId}/bookingAvailability`) : null, 
  [businessId, firestore]);

  const reservationsQuery = useMemoFirebase(() => {
    if (!businessId || !selectedDate) return null;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return query(
        collection(firestore, `businesses/${businessId}/reservations`),
        where('date', '==', dateStr)
    );
  }, [businessId, selectedDate, firestore]);

  const { data: availabilityList, isLoading: loadingAvail } = useCollection<BookingAvailability>(availabilityQuery);
  const { data: reservations, isLoading: loadingRes } = useCollection<Reservation>(reservationsQuery);

  // --- CALCULAR SLOTS DISPONIBLES ---
  const availableSlots = useMemo(() => {
    if (!selectedDate || !availabilityList || !selectedService) return [];
    
    const dayOfWeek = selectedDate.getDay();
    const dayConfig = availabilityList.find(a => a.dayOfWeek === dayOfWeek);
    
    if (!dayConfig || !dayConfig.isOpen) return [];

    // Filtrado por profesional si es específico
    const filteredReservations = selectedStaff 
        ? (reservations || []).filter(r => r.staffId === selectedStaff.id)
        : (reservations || []);

    return generateAvailableSlots(
        dayConfig, 
        selectedService.durationMinutes, 
        filteredReservations,
        selectedDate
    );
  }, [selectedDate, availabilityList, reservations, selectedService, selectedStaff]);

  const handleContinue = () => {
    if (selectedDate && selectedTime && selectedService) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      onSelectDateTime({
        date: dateStr,
        startTime: selectedTime,
        endTime: calculateEndTime(selectedTime, selectedService.durationMinutes)
      });
    }
  };

  const isLoading = loadingAvail || loadingRes;

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 sm:p-8 max-w-4xl mx-auto relative">
      <button onClick={onBack} className="absolute left-6 top-6 p-2 rounded-full hover:bg-muted/50 text-gray-500 transition-colors">
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="text-center mb-10 pt-2">
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">Selecciona fecha y hora</h2>
        <p className="text-sm text-muted-foreground font-medium">Busca el espacio que mejor se adapte a tu tiempo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Calendario */}
        <div className="space-y-4">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <CalendarIcon className="w-3 h-3" /> Escoge un día
          </Label>
          <div className="border-2 rounded-[2rem] p-4 bg-muted/10 shadow-inner">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => { setSelectedDate(date); setSelectedTime(''); }}
              month={month}
              onMonthChange={setMonth}
              disabled={(date) => isBefore(date, startOfDay(new Date()))}
              locale={es}
              className="w-full"
            />
          </div>
        </div>

        {/* Selector de Horas */}
        <div className="space-y-6">
           <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Clock className="w-3 h-3" /> Horas disponibles
              </Label>
              
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3 border-2 border-dashed rounded-3xl">
                   <Loader2 className="h-6 w-6 animate-spin text-primary" />
                   <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Verificando agenda...</p>
                </div>
              ) : availableSlots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 h-48 overflow-y-auto no-scrollbar pr-1">
                   {availableSlots.map(time => (
                     <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={cn(
                            "h-11 rounded-xl font-bold text-sm transition-all border-2",
                            selectedTime === time 
                                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105" 
                                : "bg-white border-gray-100 text-gray-600 hover:border-primary/30 hover:bg-primary/5"
                        )}
                     >
                        {time}
                     </button>
                   ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 p-6 text-center border-2 border-dashed rounded-3xl bg-muted/5">
                   <Info className="h-8 w-8 text-muted-foreground/30 mb-2" />
                   <p className="text-xs font-bold text-muted-foreground uppercase leading-tight">No hay turnos para este día</p>
                   <p className="text-[10px] text-muted-foreground mt-1">Intenta con otra fecha u otro profesional.</p>
                </div>
              )}
           </div>

           {/* Resumen Selección */}
           <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[9px] font-black text-primary uppercase tracking-widest">Tu selección</p>
                <p className="text-xs font-bold text-gray-900">
                    {selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: es }) : '---'} • {selectedTime || '--:--'}
                </p>
              </div>
              <Button 
                onClick={handleContinue} 
                disabled={!selectedDate || !selectedTime}
                className="font-black px-6 rounded-xl shadow-lg shadow-primary/10"
              >
                Continuar <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
}
