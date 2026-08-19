'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  CalendarClock, 
  Loader2, 
  Calendar, 
  Clock, 
  UserCheck,
  ChevronRight,
  Info
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { generateTimeSlots, isSlotAvailable } from '@/lib/booking-engine';
import { calculateEndTime, type Reservation, type BookingService, type BookingStaff, type BookingAvailability } from '@/models/booking';
import { rescheduleReservation } from '@/actions/booking-management';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation;
  businessId: string;
}

export function RescheduleModal({ isOpen, onClose, reservation, businessId }: RescheduleModalProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [newDate, setNewDate] = useState(reservation.date);
  const [newStaffId, setNewStaffId] = useState(reservation.staffId || '');
  const [newStartTime, setNewStartTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- DATA FETCHING ---
  const servicesQuery = useMemoFirebase(() => query(collection(firestore, `businesses/${businessId}/bookingServices`), where('isActive', '==', true)), [businessId, firestore]);
  const staffQuery = useMemoFirebase(() => collection(firestore, `businesses/${businessId}/bookingStaff`), [businessId, firestore]);
  
  const { data: services } = useCollection<BookingService>(servicesQuery);
  const { data: allStaff } = useCollection<BookingStaff>(staffQuery);

  const availableStaff = (allStaff || []).filter(s => s.assignedServiceIds.includes(reservation.serviceId) && s.isActive);

  // --- DISPONIBILIDAD ---
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isCheckingSlots, setIsCheckingSlots] = useState(false);

  useEffect(() => {
    if (!newStaffId || !newDate || !services) {
      setAvailableSlots([]);
      return;
    }

    const checkSlots = async () => {
      setIsCheckingSlots(true);
      try {
        const service = services.find(s => s.id === reservation.serviceId);
        if (!service) return;

        // 1. Parsea la fecha de forma segura sin desfases UTC (Uso de componentes locales)
        const [year, month, day] = newDate.split('-').map(Number);
        const localDate = new Date(year, month - 1, day);
        const dayOfWeek = localDate.getDay(); // 0 (Dom) a 6 (Sáb)

        const [availSnap, resSnap] = await Promise.all([
          getDocs(query(collection(firestore, `businesses/${businessId}/bookingAvailability`), where('dayOfWeek', '==', dayOfWeek))),
          getDocs(query(collection(firestore, `businesses/${businessId}/reservations`), where('staffId', '==', newStaffId), where('date', '==', newDate)))
        ]);

        let dayAvailability: BookingAvailability;

        // 2. Inyección de jornada por defecto si no existe configuración manual en DB
        if (!availSnap.empty) {
          dayAvailability = availSnap.docs[0].data() as BookingAvailability;
        } else {
          // Jornada de respaldo: Lunes a Sábado abierto (08:00 a 18:00), Domingo cerrado
          dayAvailability = {
            dayOfWeek,
            isOpen: dayOfWeek !== 0,
            shifts: [{ start: "08:00", end: "18:00" }],
            breaks: [{ start: "13:00", end: "14:00" }]
          };
        }

        // Si el día está configurado explícitamente como cerrado:
        if (!dayAvailability.isOpen) {
          setAvailableSlots([]);
          return;
        }

        // 3. Exclusión de la cita actual en colisiones para permitir movimiento en el mismo día
        const existingRes = resSnap.docs
          .map(d => ({ ...d.data(), id: d.id } as Reservation))
          .filter(r => r.id !== reservation.id && r.status !== 'cancelled');

        const allPossibleSlots = generateTimeSlots(15);
        const validSlots = allPossibleSlots.filter(startTime => {
          const endTime = calculateEndTime(startTime, service.durationMinutes);
          return isSlotAvailable({ start: startTime, end: endTime }, dayAvailability, existingRes).available;
        });

        setAvailableSlots(validSlots);
      } catch (err) {
        console.error("Error checking slots:", err);
        setAvailableSlots([]);
      } finally {
        setIsCheckingSlots(false);
      }
    };

    checkSlots();
  }, [newStaffId, newDate, services, businessId, firestore, reservation.id, reservation.serviceId]);

  const handleReschedule = async () => {
    if (!newDate || !newStartTime) return;
    setIsSubmitting(true);
    
    const result = await rescheduleReservation(businessId, reservation.id, newDate, newStartTime, newStaffId);
    
    if (result.success) {
      toast({ title: 'Turno reprogramado', description: `La cita ha sido movida al ${newDate} a las ${newStartTime}.` });
      onClose();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" /> Reprogramar Cita
          </DialogTitle>
          <DialogDescription>
            Mueve la cita de {reservation.customerName} a un nuevo horario disponible.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Horario Actual Info */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-xl border border-dashed text-xs">
            <div className="space-y-1">
                <span className="font-bold text-muted-foreground uppercase tracking-widest text-[9px]">Horario Actual</span>
                <p className="font-black">{reservation.date} • {reservation.startTime}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                <ChevronRight className="h-4 w-4 text-primary" />
            </div>
          </div>

          <div className="space-y-4">
             <div className="space-y-2">
                <Label className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary"/> Nueva Fecha</Label>
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="bg-muted/20" />
            </div>

            <div className="space-y-2">
                <Label className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-primary"/> Profesional</Label>
                <Select value={newStaffId} onValueChange={setNewStaffId}>
                    <SelectTrigger className="bg-muted/20">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {availableStaff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary"/> Nueva Hora</Label>
                <Select value={newStartTime} onValueChange={setNewStartTime} disabled={availableSlots.length === 0 || isCheckingSlots}>
                    <SelectTrigger className="bg-muted/20">
                        <SelectValue placeholder={isCheckingSlots ? "Cargando turnos..." : (availableSlots.length > 0 ? "Selecciona hora" : "Sin disponibilidad")} />
                    </SelectTrigger>
                    <SelectContent>
                        {availableSlots.map(slot => <SelectItem key={slot} value={slot}>{slot}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
          </div>

          <div className="p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-100 flex gap-3 items-start">
             <Info className="h-4 w-4 shrink-0 mt-0.5" />
             <p className="text-[10px] leading-tight font-medium">
               Al confirmar, la reserva pasará automáticamente a estado <strong>Confirmado</strong> y se registrará la fecha original en el historial.
             </p>
          </div>
        </div>

        <DialogFooter className="bg-muted/30 -mx-6 -mb-6 p-4 border-t">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button 
            className="font-black px-8" 
            onClick={handleReschedule}
            disabled={isSubmitting || !newStartTime || isCheckingSlots}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirmar Reprogramación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
