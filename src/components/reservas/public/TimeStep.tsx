
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format, isPast, isToday, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  Check,
  Loader2
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { generateAvailableSlots } from '@/lib/booking-engine';
import type { BookingAvailability, Reservation } from '@/models/booking';

export interface TimeStepProps {
  businessId: string;
  selectedStaff: string;
  serviceDuration: number;
  onSelect: (date: string, startTime: string) => void;
  onBack: () => void;
}

export function TimeStep({ businessId, selectedStaff, serviceDuration, onSelect, onBack }: TimeStepProps) {
  const firestore = useFirestore();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // --- LÓGICA DE CALENDARIO ---
  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Consulta a la disponibilidad del negocio
  const availabilityQuery = useMemoFirebase(() => 
    businessId ? collection(firestore, `businesses/${businessId}/bookingAvailability`) : null,
  [businessId, firestore]);
  
  const { data: availabilityList } = useCollection<BookingAvailability>(availabilityQuery);

  // Obtener turnos cuando se selecciona una fecha
  useEffect(() => {
    if (!selectedDate || !businessId || !availabilityList) {
      setAvailableSlots([]);
      return;
    }

    const fetchSlots = async () => {
      setIsLoadingSlots(true);
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const dayOfWeek = selectedDate.getDay();
        const dayConfig = availabilityList.find(a => a.dayOfWeek === dayOfWeek);

        if (!dayConfig || !dayConfig.isOpen) {
          setAvailableSlots([]);
          return;
        }

        // Consultar reservas existentes para el staff y fecha
        const resQuery = query(
          collection(firestore, `businesses/${businessId}/reservations`),
          where('date', '==', dateStr),
          where('staffId', '==', selectedStaff === 'any' ? null : selectedStaff)
        );
        const resSnap = await getDocs(resQuery);
        const existingRes = resSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Reservation));

        const slots = generateAvailableSlots(dayConfig, serviceDuration, existingRes, selectedDate);
        setAvailableSlots(slots);
      } catch (error) {
        console.error("Error fetching slots:", error);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDate, businessId, selectedStaff, serviceDuration, availabilityList, firestore]);

  const handleDateClick = (day: Date) => {
    if (isPast(day) && !isToday(day)) return;
    setSelectedDate(day);
  };

  return (
    <Card className="rounded-[2rem] border-none shadow-xl bg-white overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardHeader className="bg-primary/5 border-b p-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-xl shadow-sm border border-primary/20">
            <CalendarIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-black tracking-tight">Elige tu horario</CardTitle>
            <CardDescription className="text-sm font-medium">Selecciona la fecha y hora que mejor te convenga.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* Calendario */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Escoge un día</Label>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="h-8 w-8 rounded-full"><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm font-bold w-32 text-center capitalize">{format(currentMonth, 'MMMM yyyy', { locale: es })}</span>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="h-8 w-8 rounded-full"><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {['D', 'L', 'M', 'X', 'J', 'V', 'S'].map(d => (
                <div key={d} className="text-[10px] font-black text-muted-foreground/50 py-2">{d}</div>
              ))}
              {days.map((day, i) => {
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isPastDay = isPast(day) && !isToday(day);
                const dayConfig = availabilityList?.find(a => a.dayOfWeek === day.getDay());
                const isClosed = dayConfig && !dayConfig.isOpen;

                return (
                  <button
                    key={i}
                    disabled={isPastDay || isClosed}
                    onClick={() => handleDateClick(day)}
                    className={cn(
                      "aspect-square flex items-center justify-center rounded-xl text-sm font-bold transition-all relative group",
                      isSelected ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110 z-10" : 
                      isPastDay || isClosed ? "text-muted-foreground/30 cursor-not-allowed" : "hover:bg-primary/5 text-gray-700"
                    )}
                  >
                    {format(day, 'd')}
                    {isToday(day) && !isSelected && <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slots de Tiempo */}
          <div className="space-y-6">
            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Turnos Disponibles</Label>
            
            <div className="bg-muted/30 rounded-3xl p-6 min-h-[300px]">
              {isLoadingSlots ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs font-bold uppercase tracking-widest">Calculando turnos...</p>
                </div>
              ) : selectedDate ? (
                availableSlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 animate-in fade-in duration-300">
                    {availableSlots.map(slot => (
                      <Button
                        key={slot}
                        variant="outline"
                        className="h-12 rounded-xl font-black text-sm border-2 hover:border-primary hover:bg-primary/5 hover:text-primary transition-all"
                        onClick={() => onSelect(format(selectedDate, 'yyyy-MM-dd'), slot)}
                      >
                        {slot}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-4">
                    <div className="p-4 bg-white rounded-3xl shadow-sm border"><AlertCircle className="h-8 w-8 text-orange-400" /></div>
                    <div className="space-y-1">
                      <p className="font-bold text-gray-800">No hay turnos libres</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">Lo sentimos, este día ya no tiene espacios disponibles. Intenta con otra fecha.</p>
                    </div>
                  </div>
                )
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-4">
                   <div className="p-4 bg-white rounded-3xl shadow-sm border"><Clock className="h-8 w-8 text-primary/20" /></div>
                   <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Selecciona un día para ver horas</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-muted/20 border-t p-6 flex justify-between items-center">
        <Button variant="ghost" onClick={onBack} className="font-bold">Atrás</Button>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground tracking-tighter bg-white px-3 py-1 rounded-full shadow-sm border">
          <Check className="h-3 w-3 text-green-500" /> Paso 3 de 4
        </div>
      </CardFooter>
    </Card>
  );
}

export default TimeStep;
