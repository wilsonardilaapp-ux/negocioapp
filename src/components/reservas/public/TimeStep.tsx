'use client';

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { 
    Clock, 
    Calendar as CalendarIcon, 
    ArrowLeft, 
    ChevronRight, 
    AlertCircle,
    Loader2
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { generateTimeSlots, isSlotAvailable } from "@/lib/booking-engine";
import type { BookingAvailability, Reservation } from "@/models/booking";
import { calculateEndTime } from "@/models/booking";
import { format, isBefore, startOfDay, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface TimeStepProps {
  businessId: string;
  selectedStaffId: string;
  serviceDuration: number;
  onSelect: (date: string, startTime: string) => void;
  onBack: () => void;
}

export function TimeStep({ 
  businessId, 
  selectedStaffId, 
  serviceDuration, 
  onSelect, 
  onBack 
}: TimeStepProps) {
  const firestore = useFirestore();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';

  // Consultar disponibilidad y reservas en tiempo real
  useEffect(() => {
    if (!selectedDate || !businessId || !firestore) return;

    const fetchAvailability = async () => {
      setIsChecking(true);
      try {
        const dayOfWeek = selectedDate.getDay();
        
        // 1. Obtener jornada del negocio para este día
        const availSnap = await getDocs(query(
            collection(firestore, `businesses/${businessId}/bookingAvailability`),
            where('dayOfWeek', '==', dayOfWeek)
        ));

        if (availSnap.empty) {
            setAvailableSlots([]);
            return;
        }

        const availability = availSnap.docs[0].data() as BookingAvailability;
        if (!availability.isOpen) {
            setAvailableSlots([]);
            return;
        }

        // 2. Obtener reservas existentes para el staff y fecha
        const reservationsQuery = query(
            collection(firestore, `businesses/${businessId}/reservations`),
            where('date', '==', dateStr),
            where('status', 'in', ['confirmed', 'completed', 'pending'])
        );
        const resSnap = await getDocs(reservationsQuery);
        const allRes = resSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Reservation));
        
        const staffRes = selectedStaffId === 'any' 
            ? allRes 
            : allRes.filter(r => r.staffId === selectedStaffId);

        // 3. Calcular slots libres usando el motor compartido
        const allPossibleSlots = generateTimeSlots(15);
        const now = new Date();
        const isToday = format(now, 'yyyy-MM-dd') === dateStr;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const validSlots = allPossibleSlots.filter(startTime => {
            // Filtro de horas pasadas si es hoy
            if (isToday) {
                const [h, m] = startTime.split(':').map(Number);
                if ((h * 60 + m) < currentMinutes + 30) return false; // Margen de 30 min
            }

            const endTime = calculateEndTime(startTime, serviceDuration);
            return isSlotAvailable({ start: startTime, end: endTime }, availability, staffRes).available;
        });

        setAvailableSlots(validSlots);
      } catch (e) {
        console.error("Error checking slots:", e);
        setAvailableSlots([]);
      } finally {
        setIsChecking(false);
      }
    };

    fetchAvailability();
  }, [selectedDate, dateStr, businessId, selectedStaffId, serviceDuration, firestore]);

  const handleContinue = () => {
    if (dateStr && selectedTime) {
      onSelect(dateStr, selectedTime);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-gray-900">¿Cuándo vienes?</h2>
        <p className="text-muted-foreground">Selecciona el día y la hora de tu preferencia.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Calendario */}
        <Card className="p-4 border-none shadow-xl rounded-3xl">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            locale={es}
            disabled={(date) => isBefore(date, startOfDay(new Date())) || isBefore(addDays(new Date(), 30), date)}
            className="w-full"
            classNames={{
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-xl",
              day_today: "bg-muted text-foreground font-black rounded-xl",
            }}
          />
        </Card>

        {/* Slots de Tiempo */}
        <div className="space-y-4">
            <Card className="h-full border-none shadow-xl rounded-3xl overflow-hidden flex flex-col">
                <CardHeader className="bg-muted/30 border-b pb-4">
                    <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        Turnos para el {selectedDate ? format(selectedDate, 'd MMM', { locale: es }) : '...'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 flex-1">
                    {isChecking ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-xs font-bold uppercase tracking-widest">Consultando agenda...</p>
                        </div>
                    ) : availableSlots.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {availableSlots.map(time => (
                                <button
                                    key={time}
                                    onClick={() => setSelectedTime(time)}
                                    className={cn(
                                        "h-12 rounded-xl text-sm font-black transition-all border-2",
                                        selectedTime === time 
                                            ? "bg-primary text-white border-primary shadow-lg scale-105" 
                                            : "bg-white border-gray-100 text-gray-600 hover:border-primary/30"
                                    )}
                                >
                                    {time}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-48 text-center gap-4 text-muted-foreground">
                            <div className="p-3 bg-muted rounded-full"><AlertCircle className="h-6 w-6" /></div>
                            <p className="text-sm font-medium">No hay turnos disponibles para este día.</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="bg-muted/20 border-t p-6 flex justify-between items-center">
                    <Button variant="ghost" onClick={onBack} className="font-bold text-muted-foreground">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                    </Button>
                    <Button 
                        disabled={!selectedTime || isChecking} 
                        onClick={handleContinue}
                        className="font-black px-8 rounded-xl shadow-lg shadow-primary/20"
                    >
                        Continuar <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  );
}

export default TimeStep;
