import React, { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn, formatReservationDate } from "@/lib/utils";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  Check,
  Loader2
} from "lucide-react";
import { 
  format, 
  isPast, 
  isToday, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  getDay,
  addDays,
  startOfToday
} from "date-fns";
import { es } from "date-fns/locale";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { BookingAvailability, Reservation } from "@/models/booking";
import { generateAvailableSlots } from "@/lib/booking-engine";

interface TimeStepProps {
  businessId: string;
  selectedStaffId: string;
  serviceDuration: number;
  onSelect: (date: string, startTime: string) => void;
  onBack: () => void;
}

export function TimeStep({ businessId, selectedStaffId, serviceDuration, onSelect, onBack }: TimeStepProps) {
  const firestore = useFirestore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // --- 1. DATA FETCHING: DISPONIBILIDAD Y RESERVAS ---
  const availQuery = useMemoFirebase(() => collection(firestore, `businesses/${businessId}/bookingAvailability`), [businessId, firestore]);
  const { data: allAvailability } = useCollection<BookingAvailability>(availQuery);

  const fetchSlots = async (date: Date) => {
    setIsLoadingSlots(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayOfWeek = getDay(date);
      
      const dayAvail = allAvailability?.find(a => a.dayOfWeek === dayOfWeek);
      if (!dayAvail || !dayAvail.isOpen) {
        setAvailableSlots([]);
        return;
      }

      // Obtener reservas del staff para ese día
      const resQuery = query(
        collection(firestore, `businesses/${businessId}/reservations`),
        where('date', '==', dateStr),
        where('staffId', '==', selectedStaffId)
      );
      const resSnap = await getDocs(resQuery);
      const existingRes = resSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Reservation));

      const slots = generateAvailableSlots(dayAvail, serviceDuration, existingRes, date);
      setAvailableSlots(slots);
    } catch (error) {
      console.error("Error fetching slots:", error);
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (selectedDate && allAvailability) {
      fetchSlots(selectedDate);
    }
  }, [selectedDate, allAvailability, selectedStaffId]);

  // --- LÓGICA DEL CALENDARIO ---
  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: es });

  const handleDateClick = (date: Date) => {
    if (isPast(date) && !isToday(date)) return;
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const handleConfirm = () => {
    if (selectedDate && selectedTime) {
      onSelect(format(selectedDate, 'yyyy-MM-dd'), selectedTime);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Calendario */}
      <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
        <CardHeader className="p-8 pb-4">
           <div className="flex items-center justify-between mb-4">
              <CardTitle className="text-2xl font-black">Selecciona el día</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} disabled={isPast(startOfMonth(currentMonth))}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
           </div>
           <p className="text-sm font-bold text-primary uppercase tracking-widest text-center py-2 bg-primary/5 rounded-xl border border-primary/10">
              {monthLabel}
           </p>
        </CardHeader>
        <CardContent className="p-8 pt-2">
            <div className="grid grid-cols-7 gap-2 mb-4">
                {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                    <div key={i} className="text-center text-[10px] font-black text-muted-foreground uppercase">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
                {/* Espaciado inicial */}
                {Array.from({ length: getDay(days[0]) }).map((_, i) => (
                    <div key={`empty-${i}`} />
                ))}
                {days.map((date) => {
                    const isSelected = selectedDate && isSameDay(date, selectedDate);
                    const isPastDate = isPast(date) && !isToday(date);
                    const dayOfWeek = getDay(date);
                    const isClosed = allAvailability && !allAvailability.find(a => a.dayOfWeek === dayOfWeek)?.isOpen;

                    return (
                        <button
                            key={date.toString()}
                            onClick={() => handleDateClick(date)}
                            disabled={isPastDate || isClosed}
                            className={cn(
                                "aspect-square rounded-2xl flex flex-col items-center justify-center transition-all duration-300 relative group",
                                isSelected ? "bg-primary text-white shadow-lg scale-110 z-10" : "bg-muted/30 hover:bg-primary/10",
                                (isPastDate || isClosed) && "opacity-20 cursor-not-allowed bg-transparent"
                            )}
                        >
                            <span className="text-sm font-black">{format(date, 'd')}</span>
                            {isToday(date) && !isSelected && <div className="absolute bottom-2 h-1 w-1 rounded-full bg-primary" />}
                        </button>
                    );
                })}
            </div>

            <div className="mt-8 space-y-3">
                <Label className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                  <CalendarIcon className="h-3 w-3" /> Escoge un día
                </Label>
                <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-tighter">
                   <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-primary" /> Hoy</div>
                   <div className="flex items-center gap-1.5 opacity-20"><div className="h-2 w-2 rounded-full bg-muted-foreground" /> No disponible</div>
                </div>
            </div>
        </CardContent>
      </Card>

      {/* Horas */}
      <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden flex flex-col">
        <CardHeader className="p-8 pb-4">
           <CardTitle className="text-2xl font-black">Turnos Disponibles</CardTitle>
           <CardDescription className="text-sm font-medium">
              {selectedDate ? `Horarios para el ${format(selectedDate, 'd MMMM', { locale: es })}` : 'Selecciona un día para ver los turnos.'}
           </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-2 flex-1 overflow-y-auto max-h-[400px]">
          {isLoadingSlots ? (
             <div className="h-full flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Calculando espacios...</p>
             </div>
          ) : selectedDate ? (
            availableSlots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {availableSlots.map((time) => (
                        <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={cn(
                                "h-12 rounded-xl flex items-center justify-center font-black text-sm transition-all duration-300",
                                selectedTime === time 
                                    ? "bg-primary text-white shadow-md scale-105" 
                                    : "bg-muted/40 hover:bg-primary/10 text-gray-700"
                            )}
                        >
                            {time}
                        </button>
                    ))}
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center py-10 gap-4 text-center">
                    <div className="p-4 bg-muted rounded-full text-muted-foreground/30"><Clock className="h-10 w-10" /></div>
                    <div className="space-y-1">
                        <p className="font-black text-gray-400 uppercase text-xs">Sin turnos disponibles</p>
                        <p className="text-xs text-muted-foreground max-w-[200px]">Intenta seleccionar otro día u otro profesional.</p>
                    </div>
                </div>
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-10 gap-4 text-center opacity-40">
                <CalendarIcon className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm font-medium">Elige una fecha del calendario</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-muted/20 border-t p-6 flex justify-between items-center">
            <Button variant="ghost" onClick={onBack} className="font-bold">Volver</Button>
            <Button 
              onClick={handleConfirm} 
              disabled={!selectedTime} 
              className="font-black px-8 shadow-lg shadow-primary/20"
            >
              Continuar <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default TimeStep;