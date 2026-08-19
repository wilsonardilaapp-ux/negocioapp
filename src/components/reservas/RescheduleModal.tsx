
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
import { generateTimeSlots, isSlotAvailable, generateAvailableSlots } from '@/lib/booking-engine';
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

/**
 * Parseo universal de fecha (soporta YYYY-MM-DD y DD/MM/YYYY)
 * Evita desfases UTC construyendo la fecha en zona horaria local.
 */
const parseLocalDate = (dateStr: string): { localDate: Date; dayOfWeek: number; formattedDateKey: string } => {
  if (!dateStr) return { localDate: new Date(), dayOfWeek: new Date().getDay(), formattedDateKey: '' };
  
  let year = new Date().getFullYear();
  let month = new Date().getMonth();
  let day = new Date().getDate();

  if (dateStr.includes('-')) {
    const parts = dateStr.split('-').map(Number);
    year = parts[0];
    month = parts[1] - 1;
    day = parts[2];
  } else if (dateStr.includes('/')) {
    const parts = dateStr.split('/').map(Number);
    day = parts[0];
    month = parts[1] - 1;
    year = parts[2];
  }

  const localDate = new Date(year, month, day);
  const dayOfWeek = localDate.getDay();
  const formattedDateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return { localDate, dayOfWeek, formattedDateKey };
};

export function RescheduleModal({ isOpen, onClose, reservation, businessId }: RescheduleModalProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [newDate, setNewDate] = useState(reservation.date);
  const [newStaffId, setNewStaffId] = useState(reservation.staffId || '');
  const [newStartTime, setNewStartTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- DATA FETCHING ---
  const staffQuery = useMemoFirebase(() => collection(firestore, `businesses/${businessId}/bookingStaff`), [businessId, firestore]);
  const { data: allStaff } = useCollection<BookingStaff>(staffQuery);

  const availableStaff = (allStaff || []).filter(s => s.assignedServiceIds.includes(reservation.serviceId) && s.isActive);

  // --- DISPONIBILIDAD ---
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isCheckingSlots, setIsCheckingSlots] = useState(false);

  useEffect(() => {
    if (!newStaffId || !newDate || !businessId || !firestore) {
      setAvailableSlots([]);
      return;
    }

    const checkSlots = async () => {
      setIsCheckingSlots(true);
      try {
        const { localDate, dayOfWeek, formattedDateKey } = parseLocalDate(newDate);

        // Consulta de disponibilidad y reservas del negocio sin índices compuestos (Index-Free)
        const [availSnap, resSnap] = await Promise.all([
          getDocs(collection(firestore, `businesses/${businessId}/bookingAvailability`)),
          getDocs(collection(firestore, `businesses/${businessId}/reservations`))
        ]);

        // 1. Resolver disponibilidad del día (o fallback si no hay datos guardados)
        const availDocs = availSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        const dayDoc = availDocs.find(a => Number(a.dayOfWeek) === dayOfWeek || a.id === String(dayOfWeek));

        // Verificar si el documento de Firestore tiene turnos válidos
        const hasValidShifts = Boolean(
          dayDoc && 
          Array.isArray(dayDoc.shifts) && 
          dayDoc.shifts.length > 0 &&
          dayDoc.shifts[0]?.start &&
          dayDoc.shifts[0]?.end
        );

        // Un día es operativo si está explícitamente abierto con turnos válidos,
        // o si es un día laborable estándar (Lunes a Sábado: dayOfWeek !== 0)
        const isOpenEffective = dayDoc !== undefined
          ? (Boolean(dayDoc.isOpen) && hasValidShifts ? true : dayOfWeek !== 0)
          : dayOfWeek !== 0;

        const effectiveShifts = hasValidShifts
          ? dayDoc.shifts
          : [{ start: "08:00", end: "18:00" }];

        const effectiveBreaks = (dayDoc?.breaks && Array.isArray(dayDoc.breaks) && dayDoc.breaks.length > 0)
          ? dayDoc.breaks
          : [{ start: "13:00", end: "14:00" }];

        const dayAvailability: BookingAvailability = {
          dayOfWeek,
          isOpen: isOpenEffective,
          shifts: effectiveShifts,
          breaks: effectiveBreaks,
        };

        if (!dayAvailability.isOpen) {
          setAvailableSlots([]);
          setIsCheckingSlots(false);
          return;
        }

        // 2. Filtrar en memoria por fecha, especialista y excluir la cita actual (CERO ÍNDICES COMPUESTOS)
        const existingReservations = resSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter((r: any) => {
            const matchesDate = r.date === formattedDateKey || r.date === newDate;
            const matchesStaff = newStaffId && newStaffId !== 'any' ? r.staffId === newStaffId : true;
            const isNotCurrent = r.id !== reservation.id;
            const isActive = r.status !== 'cancelled';
            return matchesDate && matchesStaff && isNotCurrent && isActive;
          });

        // 3. Generar turnos disponibles válidos usando el motor central
        const duration = Number(reservation.durationMinutes) || 30;
        const slots = generateAvailableSlots(
          dayAvailability,
          duration,
          existingReservations,
          localDate
        );

        setAvailableSlots(slots);
      } catch (error) {
        console.error("Error al calcular turnos de reprogramación:", error);
        setAvailableSlots([]);
      } finally {
        setIsCheckingSlots(false);
      }
    };

    checkSlots();
  }, [newStaffId, newDate, businessId, firestore, reservation.id, reservation.durationMinutes]);

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
