
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Clock, Loader2, ChevronRight, AlertCircle } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { format, addDays, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { generateTimeSlots, isSlotAvailable } from '@/lib/booking-engine';
import { calculateEndTime, type BookingAvailability, type Reservation } from '@/models/booking';
import { cn } from '@/lib/utils';

interface Props {
  businessId: string;
  staffId: string;
  serviceDuration: number;
  onSelect: (date: string, time: string) => void;
}

export function TimeStep({ businessId, staffId, serviceDuration, onSelect }: Props) {
  const firestore = useFirestore();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Generar próximos 14 días para el carrusel de fechas
  const dateRange = eachDayOfInterval({
    start: new Date(),
    end: addDays(new Date(), 13)
  });

  useEffect(() => {
    if (!selectedDate || !businessId || !staffId) return;

    const fetchSlots = async () => {
      setIsLoading(true);
      try {
        const dateObj = new Date(selectedDate + 'T00:00:00');
        const dayOfWeek = dateObj.getDay();

        // 1. Obtener disponibilidad del profesional y reservas del día
        const [availSnap, resSnap] = await Promise.all([
          getDocs(query(collection(firestore, `businesses/${businessId}/bookingAvailability`), where('dayOfWeek', '==', dayOfWeek))),
          getDocs(query(collection(firestore, `businesses/${businessId}/reservations`), where('staffId', '==', staffId), where('date', '==', selectedDate)))
        ]);

        if (availSnap.empty) {
          setSlots([]);
          return;
        }

        const availability = availSnap.docs[0].data() as BookingAvailability;
        const existingRes = resSnap.docs.map(d => ({ ...d.data(), id: d.id } as Reservation))
                             .filter(r => r.status !== 'cancelled');

        // 2. Generar y filtrar slots
        const allPossible = generateTimeSlots(30); // Slots cada 30 min
        const valid = allPossible.filter(startTime => {
          const endTime = calculateEndTime(startTime, serviceDuration);
          return isSlotAvailable({ start: startTime, end: endTime }, availability, existingRes).available;
        });

        setSlots(valid);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSlots();
  }, [selectedDate, businessId, staffId, serviceDuration, firestore]);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-gray-900">¿Cuándo te gustaría venir?</h2>
        <p className="text-muted-foreground text-sm">Selecciona una fecha y hora disponible.</p>
      </div>

      {/* Carrusel de Fechas */}
      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar px-1">
        {dateRange.map((date) => {
          const iso = date.toISOString().split('T')[0];
          const isSelected = selectedDate === iso;
          return (
            <button
              key={iso}
              onClick={() => setSelectedDate(iso)}
              className={cn(
                "flex flex-col items-center justify-center min-w-[70px] h-20 rounded-2xl border-2 transition-all",
                isSelected ? "border-primary bg-primary text-white shadow-lg" : "border-muted bg-white text-gray-600 hover:border-primary/30"
              )}
            >
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{format(date, 'EEE', { locale: es })}</span>
              <span className="text-xl font-bold">{format(date, 'd')}</span>
            </button>
          );
        })}
      </div>

      {/* Grid de Horas */}
      <div className="space-y-4">
        <h3 className="font-bold text-sm flex items-center gap-2 px-1">
          <Clock className="h-4 w-4 text-primary" /> Turnos disponibles
        </h3>
        
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : slots.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 animate-in fade-in duration-500">
            {slots.map((time) => (
              <Button 
                key={time} 
                variant="outline" 
                className="h-12 font-black text-base rounded-xl hover:border-primary hover:text-primary transition-all"
                onClick={() => onSelect(selectedDate, time)}
              >
                {time}
              </Button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 px-6 bg-white rounded-3xl border-2 border-dashed space-y-3">
             <AlertCircle className="h-10 w-10 text-muted-foreground/30 mx-auto" />
             <p className="text-sm font-medium text-muted-foreground">No hay turnos disponibles para este día. Prueba con otra fecha.</p>
          </div>
        )}
      </div>
    </div>
  );
}
