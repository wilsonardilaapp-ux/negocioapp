
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  User, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  Smartphone,
  Tag,
  Loader2,
  CalendarCheck
} from 'lucide-react';
import type { BookingService, BookingStaff, Reservation, BookingAvailability } from '@/models/booking';
import { generateTimeSlots, isSlotAvailable } from '@/lib/booking-engine';
import { calculateEndTime } from '@/models/booking';
import { useFirebase } from '@/firebase/provider';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { confirmPublicBooking } from '@/actions/public-booking';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * @fileOverview Asistente público de 4 pasos para la reserva de citas.
 * Actualizado en Fase 13 para soportar pre-selección de servicios (Deep Linking).
 */

interface Props {
  businessId: string;
  services: BookingService[];
  staff: BookingStaff[];
  initialServiceId?: string;
}

type Step = 'service' | 'staff' | 'datetime' | 'details' | 'success';

export function BookingWizard({ businessId, services, staff, initialServiceId }: Props) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('service');
  const [selectedService, setSelectedService] = useState<BookingService | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<BookingStaff | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [customerData, setCustomerName] = useState({ name: '', phone: '', email: '', notes: '' });
  
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- LÓGICA DE DEEP LINKING (FASE 13) ---
  useEffect(() => {
    if (initialServiceId) {
      const service = services.find(s => s.id === initialServiceId);
      if (service) {
        setSelectedService(service);
        setStep('staff');
      }
    }
  }, [initialServiceId, services]);

  // --- LÓGICA DE TURNOS ---
  useEffect(() => {
    if (!selectedStaff || !selectedDate || !selectedService || !firestore) return;

    const fetchAvailability = async () => {
      setIsLoadingSlots(true);
      try {
        const dateObj = new Date(selectedDate + 'T00:00:00');
        const dayOfWeek = dateObj.getDay();

        const [availSnap, resSnap] = await Promise.all([
          getDocs(query(collection(firestore, `businesses/${businessId}/bookingAvailability`), where('dayOfWeek', '==', dayOfWeek))),
          getDocs(query(collection(firestore, `businesses/${businessId}/reservations`), where('date', '==', selectedDate), where('staffId', '==', selectedStaff.id)))
        ]);

        if (availSnap.empty) {
          setAvailableSlots([]);
          return;
        }

        const availability = availSnap.docs[0].data() as BookingAvailability;
        const existingRes = resSnap.docs.map(doc => doc.data() as Reservation);

        const allSlots = generateTimeSlots(15);
        const validSlots = allSlots.filter(slot => {
          const endTime = calculateEndTime(slot, selectedService.durationMinutes);
          return isSlotAvailable({ start: slot, end: endTime }, availability, existingRes).available;
        });

        setAvailableSlots(validSlots);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchAvailability();
  }, [selectedStaff, selectedDate, selectedService, businessId, firestore]);

  const handleConfirm = async () => {
    if (!selectedService || !selectedStaff || !selectedDate || !selectedTime) return;
    setIsSubmitting(true);
    try {
      const result = await confirmPublicBooking(businessId, {
        customerName: customerData.name,
        customerPhone: customerData.phone,
        customerEmail: customerData.email,
        serviceId: selectedService.id,
        staffId: selectedStaff.id,
        date: selectedDate,
        startTime: selectedTime,
        endTime: calculateEndTime(selectedTime, selectedService.durationMinutes),
        price: selectedService.price,
        notes: customerData.notes
      });

      if (result.success) {
        setStep('success');
      } else {
        toast({ variant: 'destructive', title: 'Horario no disponible', description: result.error });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo procesar tu reserva.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextAllowed = useMemo(() => {
    if (step === 'service') return !!selectedService;
    if (step === 'staff') return !!selectedStaff;
    if (step === 'datetime') return !!selectedDate && !!selectedTime;
    if (step === 'details') return !!customerData.name && !!customerData.phone;
    return false;
  }, [step, selectedService, selectedStaff, selectedDate, selectedTime, customerData]);

  if (step === 'success') {
    return (
      <Card className="max-w-md mx-auto rounded-[3rem] border-none shadow-2xl overflow-hidden animate-in zoom-in duration-500">
        <CardContent className="p-12 text-center space-y-6">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
             <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">¡Cita Solicitada!</h2>
            <p className="text-gray-500 font-medium">Hemos recibido tu solicitud. Te enviaremos una confirmación por WhatsApp en unos minutos.</p>
          </div>
          <div className="p-6 bg-muted/30 rounded-3xl space-y-3 text-sm">
             <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Fecha:</span><span className="font-bold">{selectedDate}</span></div>
             <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Hora:</span><span className="font-bold">{selectedTime}</span></div>
             <div className="flex justify-between"><span className="text-muted-foreground">Servicio:</span><span className="font-bold">{selectedService?.name}</span></div>
          </div>
          <Button onClick={() => window.location.reload()} className="w-full h-14 rounded-2xl font-black">Finalizar</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      {/* Paso a Paso */}
      <div className="flex justify-between px-4">
         {['service', 'staff', 'datetime', 'details'].map((s, i) => (
           <div key={s} className="flex flex-col items-center gap-2">
             <div className={cn(
               "h-10 w-10 rounded-full flex items-center justify-center font-black text-xs transition-all duration-500",
               step === s ? "bg-primary text-white scale-110 shadow-lg ring-4 ring-primary/20" : "bg-muted text-muted-foreground"
             )}>{i + 1}</div>
             <span className={cn("text-[9px] font-black uppercase tracking-widest", step === s ? "text-primary" : "text-muted-foreground")}>{s === 'datetime' ? 'Fecha' : s}</span>
           </div>
         ))}
      </div>

      <Card className="rounded-[2.5rem] shadow-xl border-none overflow-hidden bg-white">
        <CardContent className="p-8 md:p-12">
          {step === 'service' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
               <div className="space-y-1">
                  <h2 className="text-2xl font-black text-gray-900">¿Qué servicio buscas hoy?</h2>
                  <p className="text-muted-foreground font-medium">Selecciona el tratamiento o consulta que necesitas.</p>
               </div>
               <div className="grid grid-cols-1 gap-3">
                  {services.map(s => (
                    <button 
                      key={s.id} 
                      onClick={() => setSelectedService(s)}
                      className={cn(
                        "flex items-center justify-between p-5 rounded-2xl border-2 transition-all text-left",
                        selectedService?.id === s.id ? "border-primary bg-primary/5 shadow-inner" : "border-gray-100 hover:border-gray-200"
                      )}
                    >
                      <div className="flex items-center gap-4">
                         <div className="p-3 bg-muted rounded-xl text-primary"><Tag className="h-5 w-5" /></div>
                         <div className="flex flex-col">
                            <span className="font-bold text-gray-900">{s.name}</span>
                            <span className="text-xs text-muted-foreground">{s.durationMinutes} minutos</span>
                         </div>
                      </div>
                      <span className="font-black text-primary">${s.price.toLocaleString()}</span>
                    </button>
                  ))}
               </div>
            </div>
          )}

          {step === 'staff' && (
             <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div className="space-y-1">
                   <h2 className="text-2xl font-black text-gray-900">Elige a tu especialista</h2>
                   <p className="text-muted-foreground font-medium">Contamos con un equipo altamente calificado para atenderte.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   {staff.filter(s => s.assignedServiceIds.includes(selectedService?.id!)).map(s => (
                      <button 
                        key={s.id}
                        onClick={() => setSelectedStaff(s)}
                        className={cn(
                          "flex flex-col items-center p-6 rounded-3xl border-2 transition-all gap-3",
                          selectedStaff?.id === s.id ? "border-primary bg-primary/5 shadow-inner" : "border-gray-100 hover:border-gray-200"
                        )}
                      >
                         <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center shadow-sm">
                            <User className="h-8 w-8 text-muted-foreground" />
                         </div>
                         <div className="text-center">
                            <p className="font-black text-gray-900 leading-tight">{s.name}</p>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-1">{s.specialty || 'Especialista'}</p>
                         </div>
                      </button>
                   ))}
                </div>
             </div>
          )}

          {step === 'datetime' && (
             <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <div className="space-y-1">
                   <h2 className="text-2xl font-black text-gray-900">¿Cuándo te gustaría venir?</h2>
                   <p className="text-muted-foreground font-medium">Selecciona una fecha disponible para {selectedStaff?.name}.</p>
                </div>
                
                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                   {Array.from({ length: 14 }, (_, i) => {
                      const d = addDays(new Date(), i);
                      const iso = d.toISOString().split('T')[0];
                      const isSelected = selectedDate === iso;
                      return (
                        <button 
                          key={iso}
                          onClick={() => { setSelectedDate(iso); setSelectedTime(''); }}
                          className={cn(
                            "flex flex-col items-center justify-center min-w-[70px] h-20 rounded-2xl border-2 transition-all",
                            isSelected ? "border-primary bg-primary text-white shadow-lg scale-105" : "border-gray-100 text-gray-600 hover:border-gray-200"
                          )}
                        >
                           <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{format(d, 'EEE', { locale: es })}</span>
                           <span className="text-lg font-black">{format(d, 'd')}</span>
                        </button>
                      );
                   })}
                </div>

                {selectedDate && (
                   <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Horarios disponibles</Label>
                      {isLoadingSlots ? (
                         <div className="flex items-center justify-center h-24 bg-muted/20 rounded-2xl border-2 border-dashed">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                         </div>
                      ) : availableSlots.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                           {availableSlots.map(slot => (
                             <button 
                               key={slot}
                               onClick={() => setSelectedTime(slot)}
                               className={cn(
                                 "h-11 rounded-xl font-bold text-sm transition-all border-2",
                                 selectedTime === slot ? "bg-primary text-white border-primary shadow-md" : "bg-white border-gray-100 hover:border-gray-200 text-gray-700"
                               )}
                             >
                               {slot}
                             </button>
                           ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-sm font-medium text-gray-500 bg-muted/10 rounded-2xl border-2 border-dashed">
                           No hay turnos disponibles para este día. Por favor elige otra fecha.
                        </div>
                      )}
                   </div>
                )}
             </div>
          )}

          {step === 'details' && (
             <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div className="space-y-1">
                   <h2 className="text-2xl font-black text-gray-900">Tus datos de contacto</h2>
                   <p className="text-muted-foreground font-medium">Ingresa tu información para enviarte los detalles de la cita.</p>
                </div>
                <div className="space-y-4">
                   <div className="space-y-2">
                      <Label className="flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Nombre Completo</Label>
                      <Input placeholder="¿Cómo te llamas?" value={customerData.name} onChange={e => setCustomerName({...customerData, name: e.target.value})} className="h-12 rounded-xl" />
                   </div>
                   <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-primary" /> WhatsApp</Label>
                      <Input placeholder="Ej: 300 123 4567" type="tel" value={customerData.phone} onChange={e => setCustomerName({...customerData, phone: e.target.value})} className="h-12 rounded-xl" />
                   </div>
                   <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Email (Opcional)</Label>
                      <Input placeholder="tu@correo.com" type="email" value={customerData.email} onChange={e => setCustomerName({...customerData, email: e.target.value})} className="h-12 rounded-xl" />
                   </div>
                </div>
             </div>
          )}

          {/* Botones de Navegación */}
          <div className="pt-10 flex gap-3">
             {step !== 'service' && (
               <Button variant="ghost" onClick={() => {
                 if (step === 'staff') setStep('service');
                 if (step === 'datetime') setStep('staff');
                 if (step === 'details') setStep('datetime');
               }} className="font-bold h-14 rounded-2xl px-6">
                 <ChevronLeft className="h-5 w-5" />
               </Button>
             )}
             <Button 
                disabled={!nextAllowed || isSubmitting} 
                onClick={() => {
                   if (step === 'service') setStep('staff');
                   else if (step === 'staff') setStep('datetime');
                   else if (step === 'datetime') setStep('details');
                   else if (step === 'details') handleConfirm();
                }}
                className="flex-1 h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/10 transition-transform active:scale-95"
             >
                {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                  <>
                    {step === 'details' ? 'Confirmar Cita' : 'Continuar'}
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </>
                )}
             </Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex items-center justify-center gap-2 text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">
          <CalendarCheck className="h-4 w-4" />
          Plataforma de Reservas Segura
      </div>
    </div>
  );
}
