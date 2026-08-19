'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Clock, ArrowLeft, Loader2, ChevronRight, Calendar as CalendarIcon, Info } from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { format, isPast, isToday, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { calculateEndTime, isSlotAvailable, generateTimeSlots } from '@/lib/booking-engine';
import { cn } from '@/lib/utils';
import type { BookingAvailability, Reservation } from '@/models/booking';

export function TimeStep({ businessId, bookingData, onSelect, onBack }: { businessId: string, bookingData: any, onSelect: (time: string, end: string) => void, onBack: () => void }) {
  const firestore = useFirestore();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [month, setMonth] = useState<Date>(new Date());

  const availQuery = useMemoFirebase(() => collection(firestore, `businesses/${businessId}/bookingAvailability`), [businessId, firestore]);
  const { data: availabilityList } = useCollection<BookingAvailability>(availQuery);

  useEffect(() => {
    if (!selectedDate || !availabilityList) return;

    const fetchAvailability = async () => {
      setIsLoadingSlots(true);
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const dayOfWeek = selectedDate.getDay();
        
        const dayConfig = availabilityList.find(a => Number(a.dayOfWeek) === dayOfWeek);
        
        // Open by default logic
        const isDayOpen = dayConfig !== undefined ? Boolean(dayConfig.isOpen) : dayOfWeek !== 0;

        if (!isDayOpen) {
          setAvailableSlots([]);
          return;
        }

        const resQuery = query(
          collection(firestore, `businesses/${businessId}/reservations`),
          where('date', '==', dateStr)
        );
        const resSnap = await getDocs(resQuery);
        const allRes = resSnap.docs.map(d => ({ ...d.data(), id: d.id } as Reservation));
        
        // Filter in memory to avoid compound index
        const staffRes = (bookingData.staffId && bookingData.staffId !== 'any')
          ? allRes.filter(r => r.staffId === bookingData.staffId)
          : allRes;

        const effectiveShifts = (dayConfig?.shifts && dayConfig.shifts.length > 0)
          ? dayConfig.shifts
          : [{ start: '08:00', end: '18:00' }];

        const allPossible = generateTimeSlots(15);
        const valid = allPossible.filter(start => {
          const end = calculateEndTime(start, Number(bookingData.durationMinutes) || 30);
          return isSlotAvailable({ start, end }, { ...dayConfig, isOpen: true, shifts: effectiveShifts, dayOfWeek }, staffRes).available;
        });

        setAvailableSlots(valid);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchAvailability();
  }, [selectedDate, availabilityList, businessId, firestore, bookingData.staffId, bookingData.durationMinutes]);

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
      <CardHeader className="p-8 text-center bg-primary/5 border-b relative">
        <Button variant="ghost" size="icon" onClick={onBack} className="absolute left-6 top-8 rounded-full"><ArrowLeft className="h-5 w-5" /></Button>
        <CardTitle className="text-3xl font-black tracking-tight text-gray-900">Agenda tu Turno</CardTitle>
        <CardDescription className="text-base font-medium">Selecciona el día y la hora que mejor te convenga.</CardDescription>
      </CardHeader>
      
      <CardContent className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Calendario */}
          <div className="space-y-4">
             <div className="flex items-center justify-between px-2">
                <span className="text-xs font-black uppercase tracking-widest text-primary">{format(month, 'MMMM yyyy', { locale: es })}</span>
                <div className="flex gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setMonth(subMonths(month, 1))} disabled={isPast(month) && isToday(month)}><ChevronRight className="h-4 w-4 rotate-180" /></Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight className="h-4 w-4" /></Button>
                </div>
             </div>
             <CalendarUI
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={month}
                onMonthChange={setMonth}
                locale={es}
                disabled={(date) => isPast(date) && !isToday(date)}
                className="rounded-3xl border-2 border-primary/5 p-4 shadow-inner bg-white"
             />
          </div>

          {/* Horarios */}
          <div className="space-y-6">
             <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-2xl border border-dashed">
                <div className="p-2 bg-white rounded-xl shadow-sm"><CalendarIcon className="h-5 w-5 text-primary" /></div>
                <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none">Día Seleccionado</p>
                    <p className="font-bold text-gray-900">{selectedDate ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: es }) : 'Ninguno'}</p>
                </div>
             </div>

             <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3 w-3" /> Turnos Disponibles
                </h4>
                
                {isLoadingSlots ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground animate-pulse">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="text-xs font-bold uppercase tracking-widest">Consultando Agenda...</span>
                    </div>
                ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {availableSlots.map(slot => (
                            <Button 
                                key={slot} 
                                variant="outline" 
                                className="h-12 font-black rounded-xl hover:bg-primary hover:text-white border-muted shadow-sm transition-all active:scale-95"
                                onClick={() => onSelect(slot, calculateEndTime(slot, Number(bookingData.durationMinutes) || 30))}
                            >
                                {slot}
                            </Button>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center space-y-3 bg-muted/20 rounded-3xl border-2 border-dashed">
                        <Info className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
                        <p className="text-sm font-medium text-muted-foreground px-10">No hay turnos disponibles para este día. Por favor elige otra fecha.</p>
                    </div>
                )}
             </div>
          </div>
        </div>
      </CardContent>
    </div>
  );
}
