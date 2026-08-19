'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { format, isPast, isToday, addMonths, subMonths, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, AlertCircle, Check } from "lucide-react";
import { calculateEndTime, isSlotAvailable, generateAvailableSlots } from "@/lib/booking-engine";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { BookingAvailability, Reservation } from "@/models/booking";
import { Calendar } from "@/components/ui/calendar";

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
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Consultar disponibilidad y reservas existentes para el día seleccionado
  useEffect(() => {
    if (!selectedDate || !businessId) return;

    const fetchAvailability = async () => {
      setIsLoadingSlots(true);
      try {
        const dayOfWeek = selectedDate.getDay();
        const dateStr = format(selectedDate, 'yyyy-MM-dd');

        const availRef = collection(firestore, `businesses/${businessId}/bookingAvailability`);
        const availQuery = query(availRef, where('dayOfWeek', '==', dayOfWeek));
        
        const resRef = collection(firestore, `businesses/${businessId}/reservations`);
        const resQuery = selectedStaffId !== 'any' 
          ? query(resRef, where('date', '==', dateStr), where('staffId', '==', selectedStaffId))
          : query(resRef, where('date', '==', dateStr));

        const [availSnap, resSnap] = await Promise.all([
          getDocs(availQuery),
          getDocs(resQuery)
        ]);

        if (availSnap.empty) {
          setAvailableSlots([]);
          return;
        }

        const availability = availSnap.docs[0].data() as BookingAvailability;
        const existingReservations = resSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Reservation));

        const slots = generateAvailableSlots(availability, serviceDuration, existingReservations, selectedDate);
        setAvailableSlots(slots);
      } catch (error) {
        console.error("Error fetching availability:", error);
        setAvailableSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchAvailability();
  }, [selectedDate, businessId, selectedStaffId, serviceDuration, firestore]);

  const handleConfirm = () => {
    if (selectedDate && selectedTime) {
      onSelect(format(selectedDate, 'yyyy-MM-dd'), selectedTime);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Calendario */}
        <Card className="rounded-3xl border-none shadow-xl shadow-primary/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-black">Escoge un día</CardTitle>
                <CardDescription>Selecciona la fecha para tu cita.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                  setSelectedDate(date);
                  setSelectedTime(null);
              }}
              locale={es}
              className="rounded-2xl border shadow-sm"
              disabled={(date) => isPast(date) && !isToday(date)}
            />
          </CardContent>
        </Card>

        {/* Selector de Horas */}
        <Card className="rounded-3xl border-none shadow-xl shadow-primary/5 flex flex-col overflow-hidden">
          <CardHeader className="bg-muted/20 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-black">Turnos Disponibles</CardTitle>
                <CardDescription>
                    {selectedDate ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: es }) : 'Selecciona una fecha'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-6 max-h-[400px]">
            {isLoadingSlots ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Buscando espacios...</p>
              </div>
            ) : availableSlots.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {availableSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={cn(
                      "h-12 rounded-xl text-sm font-bold transition-all border-2 flex items-center justify-center gap-1.5",
                      selectedTime === time
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105"
                        : "bg-white border-gray-100 text-gray-600 hover:border-primary/30 hover:bg-primary/5"
                    )}
                  >
                    {selectedTime === time && <Check className="h-3 w-3" />}
                    {time}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center space-y-3">
                <div className="p-3 bg-muted rounded-full">
                  <AlertCircle className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-gray-800">No hay turnos libres</p>
                  <p className="text-xs text-muted-foreground">Intenta con otra fecha o profesional.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CardFooter className="bg-muted/20 border-t p-6 flex justify-between items-center rounded-b-3xl">
        <Button variant="ghost" onClick={onBack} className="font-bold rounded-xl">
          <ChevronLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
        <Button 
          disabled={!selectedDate || !selectedTime} 
          onClick={handleConfirm}
          className="font-black px-10 h-12 shadow-lg shadow-primary/10 rounded-xl"
        >
          Siguiente <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </div>
  );
}

export default TimeStep;