'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight, 
  ChevronLeft, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  CheckCircle2, 
  Loader2, 
  Smartphone,
  Sparkles,
  Award
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, normalizePhoneNumber } from '@/lib/utils';
import type { BookingService, BookingStaff, BookingAvailability, Reservation } from '@/models/booking';
import { calculateEndTime, generateTimeSlots, isSlotAvailable } from '@/lib/booking-engine';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { confirmPublicBooking } from '@/actions/public-booking';
import { useToast } from '@/hooks/use-toast';

interface Props {
  businessId: string;
  services: BookingService[];
  staff: BookingStaff[];
  initialServiceId?: string;
}

type Step = 'service' | 'staff' | 'datetime' | 'client' | 'success';

export function BookingWizard({ businessId, services, staff, initialServiceId }: Props) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [step, setStep] = useState<Step>(initialServiceId ? 'staff' : 'service');
  
  // Estado de la Reserva
  const [selectedService, setSelectedService] = useState<BookingService | null>(
    services.find(s => s.id === initialServiceId) || null
  );
  const [selectedStaff, setSelectedStaff] = useState<BookingStaff | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  const [clientData, setClientData] = useState({ name: '', phone: '', email: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- LÓGICA DE DISPONIBILIDAD ---
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const fetchAvailability = async () => {
    if (!selectedStaff || !selectedDate || !selectedService) return;
    setIsLoadingSlots(true);
    try {
      const dateObj = new Date(selectedDate + 'T00:00:00');
      const dayOfWeek = dateObj.getDay();

      const [availSnap, resSnap] = await Promise.all([
        getDocs(query(collection(firestore, `businesses/${businessId}/bookingAvailability`), where('dayOfWeek', '==', dayOfWeek))),
        getDocs(query(collection(firestore, `businesses/${businessId}/reservations`), where('staffId', '==', selectedStaff.id), where('date', '==', selectedDate)))
      ]);

      if (availSnap.empty) {
        setAvailableSlots([]);
        return;
      }

      const availability = availSnap.docs[0].data() as BookingAvailability;
      const existingRes = resSnap.docs.map(d => ({ ...d.data(), id: d.id } as Reservation));

      const allPossibleSlots = generateTimeSlots(15);
      const validSlots = allPossibleSlots.filter(startTime => {
        const endTime = calculateEndTime(startTime, selectedService.durationMinutes);
        return isSlotAvailable({ start: startTime, end: endTime }, availability, existingRes).available;
      });

      setAvailableSlots(validSlots);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (step === 'datetime') fetchAvailability();
  }, [step, selectedDate, selectedStaff]);

  const handleConfirm = async () => {
    if (!selectedService || !selectedStaff || !selectedDate || !selectedTime) return;
    setIsSubmitting(true);
    try {
      const data = {
        customerName: clientData.name,
        customerPhone: normalizePhoneNumber(clientData.phone),
        customerEmail: clientData.email,
        serviceId: selectedService.id,
        staffId: selectedStaff.id,
        date: selectedDate,
        startTime: selectedTime,
        endTime: calculateEndTime(selectedTime, selectedService.durationMinutes),
        price: selectedService.price,
        notes: clientData.notes
      };

      const result = await confirmPublicBooking(businessId, data as any);
      if (result.success) {
        setStep('success');
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-700">
      <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
        <CardHeader className="bg-primary/5 border-b p-8">
           <div className="flex items-center justify-between mb-4">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={cn(
                    "h-1.5 w-8 rounded-full transition-all",
                    (step === 'service' && i === 1) || 
                    (step === 'staff' && i <= 2) || 
                    (step === 'datetime' && i <= 3) || 
                    (step === 'client' && i <= 4) ? "bg-primary" : "bg-muted"
                  )} />
                ))}
              </div>
              <Badge variant="outline" className="bg-white border-primary/20 text-primary font-bold">Reserva Online</Badge>
           </div>
           <CardTitle className="text-2xl font-black tracking-tight">
              {step === 'service' && 'Selecciona un Servicio'}
              {step === 'staff' && 'Elige un Profesional'}
              {step === 'datetime' && 'Fecha y Hora'}
              {step === 'client' && 'Tus Datos'}
              {step === 'success' && '¡Reserva Exitosa!'}
           </CardTitle>
           <CardDescription>
              {step === 'service' && '¿Qué servicio deseas agendar hoy?'}
              {step === 'staff' && `Selecciona quién te atenderá para ${selectedService?.name}`}
              {step === 'datetime' && 'Busca el espacio que mejor se adapte a tu agenda.'}
              {step === 'client' && 'Completa tu información para confirmar el turno.'}
           </CardDescription>
        </CardHeader>

        <CardContent className="p-8">
          {step === 'service' && (
            <div className="grid gap-4">
              {services.map(s => (
                <button 
                  key={s.id}
                  onClick={() => { setSelectedService(s); setStep('staff'); }}
                  className="flex items-center justify-between p-5 rounded-2xl border-2 hover:border-primary hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="space-y-1">
                    <p className="font-bold text-gray-900 group-hover:text-primary transition-colors">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.durationMinutes} min • {s.description}</p>
                  </div>
                  <span className="font-black text-primary">${s.price.toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}

          {step === 'staff' && (
            <div className="grid gap-4">
              {staff.filter(s => s.assignedServiceIds.includes(selectedService?.id!)).map(s => (
                <button 
                  key={s.id}
                  onClick={() => { setSelectedStaff(s); setStep('datetime'); }}
                  className="flex items-center gap-4 p-5 rounded-2xl border-2 hover:border-primary hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 group-hover:text-primary transition-colors">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.specialty || 'Especialista'}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {step === 'datetime' && (
            <div className="space-y-6">
               <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">1. Selecciona el día</Label>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {Array.from({ length: 14 }).map((_, i) => {
                      const d = addDays(new Date(), i);
                      const iso = d.toISOString().split('T')[0];
                      const isSelected = selectedDate === iso;
                      return (
                        <button
                          key={iso}
                          onClick={() => { setSelectedDate(iso); setSelectedTime(''); }}
                          className={cn(
                            "flex flex-col items-center justify-center min-w-[70px] h-20 rounded-2xl border-2 transition-all shrink-0",
                            isSelected ? "bg-primary border-primary text-white shadow-lg" : "bg-white border-gray-100 hover:border-primary/20"
                          )}
                        >
                          <span className="text-[10px] font-bold uppercase">{format(d, 'EEE', { locale: es })}</span>
                          <span className="text-xl font-black">{format(d, 'd')}</span>
                        </button>
                      );
                    })}
                  </div>
               </div>

               <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">2. Turnos disponibles</Label>
                  {isLoadingSlots ? (
                    <div className="h-32 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-xs font-medium text-muted-foreground">Buscando espacios...</span>
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {availableSlots.map(slot => (
                        <button
                          key={slot}
                          onClick={() => setSelectedTime(slot)}
                          className={cn(
                            "py-3 rounded-xl border-2 font-bold text-sm transition-all",
                            selectedTime === slot ? "bg-primary border-primary text-white" : "bg-muted/30 border-transparent hover:border-primary/20"
                          )}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-muted/20 rounded-2xl border-2 border-dashed border-muted-foreground/10">
                      <p className="text-xs font-medium text-muted-foreground">No hay turnos disponibles para este día. Prueba con otra fecha.</p>
                    </div>
                  )}
               </div>
            </div>
          )}

          {step === 'client' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Nombre Completo</Label>
                <Input 
                  className="h-12 bg-muted/20 border-none rounded-xl"
                  value={clientData.name} 
                  onChange={e => setClientData({...clientData, name: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">WhatsApp / Teléfono</Label>
                <Input 
                  className="h-12 bg-muted/20 border-none rounded-xl"
                  placeholder="300 123 4567"
                  value={clientData.phone} 
                  onChange={e => setClientData({...clientData, phone: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Correo (Opcional)</Label>
                <Input 
                  className="h-12 bg-muted/20 border-none rounded-xl"
                  type="email"
                  value={clientData.email} 
                  onChange={e => setClientData({...clientData, email: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Notas Especiales</Label>
                <Textarea 
                  className="bg-muted/20 border-none rounded-xl resize-none h-24"
                  value={clientData.notes} 
                  onChange={e => setClientData({...clientData, notes: e.target.value})} 
                />
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-10 space-y-6">
                <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 animate-in zoom-in duration-500">
                  <CheckCircle2 className="h-12 w-12" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-gray-900">¡Cita Solicitada!</h2>
                  <p className="text-muted-foreground max-w-xs mx-auto">Hemos recibido tu reserva. Te enviaremos una confirmación por WhatsApp en unos minutos.</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-3xl border border-dashed text-left space-y-2">
                   <p className="text-xs font-bold uppercase text-muted-foreground tracking-widest">Resumen del Turno</p>
                   <p className="font-bold text-sm">{selectedService?.name}</p>
                   <p className="text-sm font-medium">{format(new Date(selectedDate + 'T00:00:00'), 'PPP', { locale: es })} • {selectedTime}</p>
                </div>
                <Button className="w-full h-12 font-bold rounded-xl" onClick={() => window.location.reload()}>Agendar otra cita</Button>
            </div>
          )}
        </CardContent>

        {step !== 'success' && (
          <CardFooter className="bg-muted/20 p-8 border-t flex justify-between gap-4">
             <Button 
                variant="ghost" 
                className="font-bold h-12 px-6" 
                onClick={() => {
                  if (step === 'staff') setStep('service');
                  if (step === 'datetime') setStep('staff');
                  if (step === 'client') setStep('datetime');
                }}
                disabled={step === 'service' || isSubmitting}
             >
                <ChevronLeft className="mr-2 h-4 w-4" /> Atrás
             </Button>

             <Button 
                className="font-black h-12 px-10 shadow-lg shadow-primary/20"
                disabled={
                  (step === 'service' && !selectedService) ||
                  (step === 'staff' && !selectedStaff) ||
                  (step === 'datetime' && !selectedTime) ||
                  (step === 'client' && (!clientData.name || !clientData.phone)) ||
                  isSubmitting
                }
                onClick={() => {
                  if (step === 'service') setStep('staff');
                  if (step === 'staff') setStep('datetime');
                  if (step === 'datetime') setStep('client');
                  if (step === 'client') handleConfirm();
                }}
             >
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando...</>
                ) : (
                  <>
                    {step === 'client' ? 'Confirmar Reserva' : 'Siguiente'}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
             </Button>
          </CardFooter>
        )}
      </Card>

      <div className="mt-8 text-center">
         <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Agendamiento Seguro • Markix SaaS</p>
      </div>
    </div>
  );
}
