'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Clock, 
  User, 
  Calendar as CalendarIcon, 
  Tag, 
  Sparkles,
  Loader2,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BookingService, BookingStaff, BookingAvailability, Reservation } from '@/models/booking';
import { calculateEndTime } from '@/models/booking';
import { generateTimeSlots, isSlotAvailable } from '@/lib/booking-engine';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { confirmPublicBooking } from '@/actions/public-booking';
import { useToast } from '@/hooks/use-toast';

interface BookingWizardProps {
  businessId: string;
  services: BookingService[];
  staff: BookingStaff[];
  initialServiceId?: string;
}

type Step = 'service' | 'staff' | 'datetime' | 'confirmation' | 'success';

export function BookingWizard({ businessId, services, staff, initialServiceId }: BookingWizardProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  // --- ESTADO DEL WIZARD ---
  const [step, setStep] = useState<Step>('service');
  const [selectedService, setSelectedService] = useState<BookingService | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<BookingStaff | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  const [customerData, setCustomerName] = useState({ name: '', phone: '', email: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- LÓGICA DE DEEP LINKING ---
  useEffect(() => {
    if (initialServiceId) {
      const service = services.find(s => s.id === initialServiceId);
      if (service) {
        setSelectedService(service);
        setStep('staff');
      }
    }
  }, [initialServiceId, services]);

  // --- FILTRADO DE STAFF ---
  const availableStaff = useMemo(() => {
    if (!selectedService) return [];
    return staff.filter(s => s.assignedServiceIds.includes(selectedService.id) && s.isActive);
  }, [selectedService, staff]);

  // --- DISPONIBILIDAD DE HORARIOS ---
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  useEffect(() => {
    if (step !== 'datetime' || !selectedDate || !selectedStaff || !selectedService || !firestore) return;

    const checkAvailability = async () => {
      setIsLoadingSlots(true);
      try {
        const dateObj = new Date(selectedDate + 'T00:00:00');
        const dayOfWeek = dateObj.getDay();

        // 1. Obtener disponibilidad del profesional para este día
        const availQuery = query(
          collection(firestore, `businesses/${businessId}/bookingAvailability`),
          where('dayOfWeek', '==', dayOfWeek)
        );
        const availSnap = await getDocs(availQuery);

        if (availSnap.empty) {
          setAvailableSlots([]);
          return;
        }

        const availability = availSnap.docs[0].data() as BookingAvailability;

        // 2. Obtener reservas existentes
        const resQuery = query(
          collection(firestore, `businesses/${businessId}/reservations`),
          where('date', '==', selectedDate),
          where('staffId', '==', selectedStaff.id)
        );
        const resSnap = await getDocs(resQuery);
        const existingReservations = resSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Reservation));

        // 3. Generar y validar slots
        const allPossibleSlots = generateTimeSlots(15);
        const validSlots = allPossibleSlots.filter(startTime => {
          const endTime = calculateEndTime(startTime, selectedService.durationMinutes);
          const proposed = { start: startTime, end: endTime };
          return isSlotAvailable(proposed, availability, existingReservations).available;
        });

        setAvailableSlots(validSlots);
      } catch (error) {
        console.error('Error checking availability:', error);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    checkAvailability();
  }, [step, selectedDate, selectedStaff, selectedService, businessId, firestore]);

  // --- ACCIONES ---
  const handleConfirm = async () => {
    if (!selectedService || !selectedStaff || !selectedDate || !selectedTime) return;
    
    setIsSubmitting(true);
    try {
      const result = await confirmPublicBooking(businessId, {
        serviceId: selectedService.id,
        staffId: selectedStaff.id,
        date: selectedDate,
        startTime: selectedTime,
        endTime: calculateEndTime(selectedTime, selectedService.durationMinutes),
        customerName: customerData.name,
        customerPhone: customerData.phone,
        customerEmail: customerData.email,
        notes: customerData.notes,
        price: selectedService.price,
      });

      if (result.success) {
        setStep('success');
      } else {
        toast({ variant: 'destructive', title: 'Error al reservar', description: result.error });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error técnico', description: 'No se pudo procesar la reserva.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 'service', label: 'Servicio', icon: Tag },
    { id: 'staff', label: 'Profesional', icon: User },
    { id: 'datetime', label: 'Horario', icon: Clock },
    { id: 'confirmation', label: 'Confirmar', icon: CheckCircle2 },
  ];

  if (step === 'success') {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 animate-in zoom-in duration-500">
        <div className="flex justify-center mb-8">
          <div className="p-6 bg-green-100 rounded-[3rem] shadow-lg shadow-green-100/50">
            <Check className="h-16 w-16 text-green-600" strokeWidth={3} />
          </div>
        </div>
        <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter">¡Reserva Solicitada!</h1>
        <p className="text-gray-600 text-lg mb-10 max-w-md mx-auto">
          Hemos recibido tu solicitud. Te enviaremos un mensaje de confirmación por WhatsApp en unos momentos.
        </p>
        <Button size="lg" className="px-10 h-14 rounded-2xl font-black shadow-xl" onClick={() => window.location.href = '/'}>
          Volver al Inicio
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Indicador de pasos */}
      <div className="flex items-center justify-between px-4">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div className={cn(
              "flex flex-col items-center gap-2 transition-all duration-500",
              step === s.id ? "scale-110" : "opacity-40"
            )}>
              <div className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center border-2",
                step === s.id ? "bg-primary border-primary text-white shadow-lg" : "bg-white border-gray-200 text-gray-400"
              )}>
                <s.icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="w-8 sm:w-16 h-[2px] bg-gray-200 mx-2 sm:mx-4 mt-[-15px]" />
            )}
          </div>
        ))}
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white/80 backdrop-blur-xl">
        {/* STEP: SERVICE SELECTION */}
        {step === 'service' && (
          <div className="p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Elige un servicio</h2>
              <p className="text-muted-foreground text-sm">Contamos con una amplia oferta diseñada para tu bienestar.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {services.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedService(s); setStep('staff'); }}
                  className="p-5 text-left rounded-3xl border-2 hover:border-primary hover:bg-primary/5 transition-all group flex flex-col justify-between h-full bg-white shadow-sm"
                >
                  <div className="flex justify-between items-start mb-4">
                    <Badge variant="outline" className="text-[9px] uppercase tracking-widest font-black border-primary/20 text-primary">{s.category || 'General'}</Badge>
                    <span className="text-primary group-hover:translate-x-1 transition-transform"><ChevronRight className="h-5 w-5" /></span>
                  </div>
                  <div className="space-y-1">
                    <p className="font-black text-gray-900">{s.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {s.durationMinutes} min</span>
                      <span className="font-bold text-gray-900">${s.price.toLocaleString('es-CO')}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP: STAFF SELECTION */}
        {step === 'staff' && (
          <div className="p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">¿Quién te atenderá?</h2>
              <p className="text-muted-foreground text-sm">Contamos con un equipo de profesionales certificados.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {availableStaff.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedStaff(s); setStep('datetime'); }}
                  className="p-6 text-left rounded-3xl border-2 hover:border-primary hover:bg-primary/5 transition-all group flex items-center gap-4 bg-white shadow-sm"
                >
                  <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <User className="h-8 w-8" />
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-gray-900">{s.name}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">{s.specialty || 'Especialista'}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-primary" />
                </button>
              ))}
              {availableStaff.length === 0 && (
                <div className="col-span-full py-10 text-center bg-muted/20 rounded-3xl border-2 border-dashed">
                  <p className="text-muted-foreground font-medium">No hay profesionales disponibles para este servicio en este momento.</p>
                </div>
              )}
            </div>
            <Button variant="ghost" onClick={() => setStep('service')} className="font-bold">
              <ChevronLeft className="h-4 w-4 mr-2" /> Cambiar servicio
            </Button>
          </div>
        )}

        {/* STEP: DATETIME SELECTION */}
        {step === 'datetime' && (
          <div className="p-8 space-y-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Elige el momento ideal</h2>
              <p className="text-muted-foreground text-sm">Reserva tu espacio según tu conveniencia.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                  <Label className="text-xs font-black uppercase tracking-widest text-primary">1. Selecciona el día</Label>
                  <Input 
                    type="date" 
                    min={new Date().toISOString().split('T')[0]} 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="h-12 text-lg font-bold rounded-xl border-2 bg-white"
                  />
               </div>

               <div className="space-y-4">
                  <Label className="text-xs font-black uppercase tracking-widest text-primary">2. Selecciona la hora</Label>
                  {isLoadingSlots ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground font-medium">Buscando espacios libres...</span>
                    </div>
                  ) : selectedDate ? (
                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-2">
                       {availableSlots.length > 0 ? availableSlots.map(time => (
                         <button
                           key={time}
                           onClick={() => setSelectedTime(time)}
                           className={cn(
                             "py-3 rounded-xl text-sm font-bold border-2 transition-all",
                             selectedTime === time 
                                ? "bg-primary border-primary text-white shadow-md scale-105" 
                                : "bg-white border-gray-100 hover:border-primary/40 text-gray-600"
                           )}
                         >
                           {time}
                         </button>
                       )) : (
                         <div className="col-span-3 text-center py-10 text-muted-foreground bg-muted/20 rounded-2xl">
                           No hay turnos disponibles para este día.
                         </div>
                       )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center gap-2 opacity-40">
                        <CalendarIcon className="h-8 w-8" />
                        <span className="text-xs font-bold uppercase tracking-widest">Elige una fecha primero</span>
                    </div>
                  )}
               </div>
            </div>

            <div className="flex justify-between border-t pt-8">
              <Button variant="ghost" onClick={() => setStep('staff')} className="font-bold">
                <ChevronLeft className="h-4 w-4 mr-2" /> Volver
              </Button>
              <Button 
                onClick={() => setStep('confirmation')} 
                disabled={!selectedDate || !selectedTime}
                className="font-black px-10 h-12 rounded-2xl shadow-xl"
              >
                Siguiente Paso <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP: CONFIRMATION & FORM */}
        {step === 'confirmation' && (
          <div className="p-8 space-y-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Completa tu registro</h2>
              <p className="text-muted-foreground text-sm">Solo unos datos más para confirmar tu turno.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Resumen Final */}
               <div className="space-y-6">
                  <div className="p-6 bg-primary/5 rounded-[2rem] border-2 border-primary/10 space-y-6">
                      <h3 className="font-black text-primary uppercase tracking-[0.2em] text-[10px]">Tu Cita</h3>
                      <div className="space-y-4">
                          <div className="flex items-start gap-3">
                              <div className="p-2 bg-white rounded-xl shadow-sm text-primary"><Clock className="h-5 w-5" /></div>
                              <div>
                                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest leading-none mb-1">Día y Hora</p>
                                  <p className="text-lg font-black text-gray-900">{selectedDate} • {selectedTime}</p>
                              </div>
                          </div>
                          <div className="flex items-start gap-3">
                              <div className="p-2 bg-white rounded-xl shadow-sm text-primary"><Tag className="h-5 w-5" /></div>
                              <div>
                                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest leading-none mb-1">Servicio</p>
                                  <p className="text-lg font-black text-gray-900">{selectedService?.name}</p>
                              </div>
                          </div>
                          <div className="flex items-start gap-3">
                              <div className="p-2 bg-white rounded-xl shadow-sm text-primary"><UserCheck className="h-5 w-5" /></div>
                              <div>
                                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest leading-none mb-1">Atendido por</p>
                                  <p className="text-lg font-black text-gray-900">{selectedStaff?.name}</p>
                              </div>
                          </div>
                      </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-white rounded-2xl border shadow-sm">
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total a pagar</span>
                      <span className="text-2xl font-black text-primary">${selectedService?.price.toLocaleString('es-CO')}</span>
                  </div>
               </div>

               {/* Formulario */}
               <div className="space-y-4">
                  <div className="space-y-1.5">
                      <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nombre Completo *</Label>
                      <Input 
                        placeholder="Ej: Juan Pérez" 
                        className="h-12 bg-white font-bold"
                        value={customerData.name}
                        onChange={(e) => setCustomerName({...customerData, name: e.target.value})}
                      />
                  </div>
                  <div className="space-y-1.5">
                      <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">WhatsApp / Teléfono *</Label>
                      <Input 
                        placeholder="Ej: 300 123 4567" 
                        className="h-12 bg-white font-bold"
                        value={customerData.phone}
                        onChange={(e) => setCustomerName({...customerData, phone: e.target.value})}
                      />
                  </div>
                  <div className="space-y-1.5">
                      <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Email (Opcional)</Label>
                      <Input 
                        placeholder="ejemplo@correo.com" 
                        className="h-12 bg-white font-bold"
                        value={customerData.email}
                        onChange={(e) => setCustomerName({...customerData, email: e.target.value})}
                      />
                  </div>
                  <div className="space-y-1.5">
                      <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Notas adicionales</Label>
                      <Textarea 
                        placeholder="¿Algo que debamos saber?" 
                        className="bg-white min-h-[80px] resize-none"
                        value={customerData.notes}
                        onChange={(e) => setCustomerName({...customerData, notes: e.target.value})}
                      />
                  </div>
               </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4 border-t pt-8">
              <Button variant="ghost" onClick={() => setStep('datetime')} className="font-bold" disabled={isSubmitting}>
                <ChevronLeft className="h-4 w-4 mr-2" /> Cambiar horario
              </Button>
              <Button 
                onClick={handleConfirm} 
                disabled={isSubmitting || !customerData.name || !customerData.phone}
                className="font-black px-12 h-14 rounded-2xl shadow-xl bg-primary text-lg"
              >
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
                Confirmar Reserva
              </Button>
            </div>
          </div>
        )}
      </Card>
      
      <p className="text-center text-[10px] font-black uppercase text-muted-foreground tracking-[0.3em]">
        Potenciado por Markix SaaS — Sistema de Citas Blindado
      </p>
    </div>
  );
}
