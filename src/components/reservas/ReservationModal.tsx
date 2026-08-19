
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Calendar, Clock, User, Phone, Tag, UserCheck, AlertCircle } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, setDoc, getDocs } from 'firebase/firestore';
import type { BookingService, BookingStaff, BookingAvailability, Reservation } from '@/models/booking';
import { calculateEndTime } from '@/models/booking';
import { generateTimeSlots, isSlotAvailable } from '@/lib/booking-engine';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const reservationSchema = z.object({
  serviceId: z.string().min(1, 'Selecciona un servicio.'),
  staffId: z.string().min(1, 'Selecciona un profesional.'),
  date: z.string().min(1, 'Selecciona una fecha.'),
  startTime: z.string().min(1, 'Selecciona una hora.'),
  customerName: z.string().min(3, 'El nombre es requerido.'),
  customerPhone: z.string().min(7, 'Ingresa un teléfono válido.'),
  customerEmail: z.string().email('Email no válido.').optional().or(z.literal('')),
  notes: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'no_show']),
});

type ReservationFormData = z.infer<typeof reservationSchema>;

interface ReservationModalProps {
  existingReservation?: Reservation | null;
  onSave: () => void;
  onClose: () => void;
}

export function ReservationModal({ existingReservation, onSave, onClose }: ReservationModalProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm<ReservationFormData>({
    resolver: zodResolver(reservationSchema),
    defaultValues: existingReservation ? {
      ...existingReservation,
      customerEmail: existingReservation.customerEmail || '',
      notes: existingReservation.notes || '',
    } : {
      date: new Date().toISOString().split('T')[0],
      status: 'confirmed',
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      notes: '',
    }
  });

  // --- 1. DATA FETCHING ---
  const servicesQuery = useMemoFirebase(() => user ? query(collection(firestore, `businesses/${user.uid}/bookingServices`), where('isActive', '==', true)) : null, [user, firestore]);
  const staffQuery = useMemoFirebase(() => user ? collection(firestore, `businesses/${user.uid}/bookingStaff`) : null, [user, firestore]);
  
  const { data: services } = useCollection<BookingService>(servicesQuery);
  const { data: allStaff } = useCollection<BookingStaff>(staffQuery);

  const selectedServiceId = watch('serviceId');
  const selectedStaffId = watch('staffId');
  const selectedDate = watch('date');
  const customerPhone = watch('customerPhone');

  // Filtrar profesionales que realizan el servicio
  const availableStaff = useMemo(() => {
    if (!selectedServiceId || !allStaff) return [];
    return allStaff.filter(s => s.assignedServiceIds.includes(selectedServiceId) && s.isActive);
  }, [selectedServiceId, allStaff]);

  // Autocompletado de cliente
  useEffect(() => {
    if (customerPhone && customerPhone.length >= 10 && user) {
        const checkClient = async () => {
            const q = query(collection(firestore, `businesses/${user.uid}/loyaltyBalances`), where('whatsapp', '==', customerPhone));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const clientData = snap.docs[0].data();
                if (clientData.name) setValue('customerName', clientData.name);
            }
        };
        checkClient();
    }
  }, [customerPhone, user, firestore, setValue]);

  // --- 2. ENGINE LÓGICA DE DISPONIBILIDAD ---
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isCheckingSlots, setIsCheckingSlots] = useState(false);

  useEffect(() => {
    if (!selectedStaffId || !selectedDate || !selectedServiceId || !services || !user) {
        setAvailableSlots([]);
        return;
    }

    const checkSlots = async () => {
        setIsCheckingSlots(true);
        try {
            const service = services.find(s => s.id === selectedServiceId);
            if (!service) return;

            const dateObj = new Date(selectedDate + 'T00:00:00');
            const dayOfWeek = dateObj.getDay(); // 0 (Dom) - 6 (Sab)

            // Obtener disponibilidad y reservas del profesional
            const [availSnap, resSnap] = await Promise.all([
                getDocs(query(collection(firestore, `businesses/${user.uid}/bookingAvailability`), where('dayOfWeek', '==', dayOfWeek))),
                getDocs(query(collection(firestore, `businesses/${user.uid}/reservations`), where('staffId', '==', selectedStaffId), where('date', '==', selectedDate)))
            ]);

            if (availSnap.empty) {
                setAvailableSlots([]);
                return;
            }

            const availability = availSnap.docs[0].data() as BookingAvailability;
            const existingRes = resSnap.docs.map(d => ({ ...d.data(), id: d.id } as Reservation))
                                .filter(r => r.id !== existingReservation?.id); // Excluir la actual si estamos editando

            const allPossibleSlots = generateTimeSlots(15);
            const validSlots = allPossibleSlots.filter(startTime => {
                const endTime = calculateEndTime(startTime, service.durationMinutes);
                return isSlotAvailable({ start: startTime, end: endTime }, availability, existingRes).available;
            });

            setAvailableSlots(validSlots);
        } finally {
            setIsCheckingSlots(false);
        }
    };

    checkSlots();
  }, [selectedStaffId, selectedDate, selectedServiceId, services, user, firestore, existingReservation]);

  const onSubmit = async (data: ReservationFormData) => {
    if (!user || !firestore || !services) return;
    setIsSubmitting(true);
    try {
        const service = services.find(s => s.id === data.serviceId);
        if (!service) throw new Error('Servicio no encontrado');

        const reservationId = existingReservation?.id || doc(collection(firestore, 'placeholder')).id;
        const resRef = doc(firestore, `businesses/${user.uid}/reservations`, reservationId);

        const newReservation: Reservation = {
            id: reservationId,
            businessId: user.uid,
            ...data,
            durationMinutes: service.durationMinutes,
            endTime: calculateEndTime(data.startTime, service.durationMinutes),
            price: service.price,
            source: 'admin',
            createdAt: existingReservation?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await setDoc(resRef, newReservation);
        toast({ title: 'Reserva guardada', description: `Cita para ${data.customerName} registrada con éxito.` });
        onSave();
        onClose();
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error al agendar', description: e.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Columna Izquierda: Servicio y Profesional */}
        <div className="space-y-4">
           <div className="space-y-2">
            <Label className="flex items-center gap-2"><Tag className="h-4 w-4 text-primary"/> Servicio</Label>
            <Controller
                name="serviceId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="bg-muted/20">
                      <SelectValue placeholder="Selecciona un servicio" />
                    </SelectTrigger>
                    <SelectContent>
                      {services?.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.durationMinutes} min)</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            {errors.serviceId && <p className="text-xs text-destructive">{errors.serviceId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-primary"/> Profesional</Label>
            <Controller
                name="staffId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedServiceId}>
                    <SelectTrigger className="bg-muted/20">
                      <SelectValue placeholder={selectedServiceId ? "Selecciona un profesional" : "Primero elige un servicio"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStaff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            {errors.staffId && <p className="text-xs text-destructive">{errors.staffId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary"/> Fecha</Label>
                <Input type="date" {...register('date')} className="bg-muted/20" />
            </div>
            <div className="space-y-2">
                <Label className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary"/> Hora</Label>
                <Controller
                    name="startTime"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value} disabled={availableSlots.length === 0 || isCheckingSlots}>
                            <SelectTrigger className="bg-muted/20">
                                <SelectValue placeholder={isCheckingSlots ? "Cargando..." : (availableSlots.length > 0 ? "Hora" : "Sin turnos")} />
                            </SelectTrigger>
                            <SelectContent>
                                {availableSlots.map(slot => <SelectItem key={slot} value={slot}>{slot}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>
          </div>
        </div>

        {/* Columna Derecha: Cliente */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary"/> WhatsApp / Teléfono</Label>
            <Input {...register('customerPhone')} placeholder="300 123 4567" className="bg-muted/20" />
            {errors.customerPhone && <p className="text-xs text-destructive">{errors.customerPhone.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2"><User className="h-4 w-4 text-primary"/> Nombre del Cliente</Label>
            <Input {...register('customerName')} placeholder="Nombre completo" className="bg-muted/20" />
            {errors.customerName && <p className="text-xs text-destructive">{errors.customerName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Notas / Requerimientos Especiales</Label>
            <Textarea {...register('notes')} placeholder="Alergias, preferencias, etc." className="h-24 resize-none bg-muted/20" />
          </div>
        </div>
      </div>

      <div className="p-4 bg-muted/30 rounded-xl border border-dashed flex items-center justify-between">
        <div className="space-y-1">
            <Label>Estado de la Reserva</Label>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Cambiar estado operativo</p>
        </div>
        <Controller
            name="status"
            control={control}
            render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="w-40 h-9 font-bold bg-white">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="confirmed">Confirmada</SelectItem>
                        <SelectItem value="completed">Completada</SelectItem>
                        <SelectItem value="cancelled">Cancelada</SelectItem>
                        <SelectItem value="no_show">No Asistió</SelectItem>
                    </SelectContent>
                </Select>
            )}
        />
      </div>

      <DialogFooter className="bg-muted/20 -mx-6 -mb-6 p-6 border-t">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting || isCheckingSlots} className="font-black px-10">
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {existingReservation ? 'Actualizar Cita' : 'Confirmar Reserva'}
        </Button>
      </DialogFooter>
    </form>
  );
}
