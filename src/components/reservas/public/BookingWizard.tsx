'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CalendarDays, 
  User, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  Loader2,
  Calendar as CalendarIcon,
  Smartphone,
  Mail,
  UserCheck,
  Tag
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { generateTimeSlots, isSlotAvailable } from '@/lib/booking-engine';
import { calculateEndTime, type BookingService, type BookingStaff, type BookingAvailability, type Reservation } from '@/models/booking';
import { confirmPublicBooking } from '@/actions/public-booking';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface BookingWizardProps {
  businessId: string;
  services: BookingService[];
  staff: BookingStaff[];
  initialServiceId?: string;
}

type Step = 'service' | 'staff' | 'time' | 'details' | 'success';

export function BookingWizard({ businessId, services, staff, initialServiceId }: BookingWizardProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  const [step, setStep] = useState<Step>('service');
  const [selectedService, setSelectedService] = useState<BookingService | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<BookingStaff | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedStartTime] = useState<string>('');
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- LÓGICA DE DISPONIBILIDAD ---
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isCheckingSlots, setIsCheckingSlots] = useState(false);

  // Pre-selección de servicio si viene por URL
  useEffect(() => {
    if (initialServiceId) {
      const service = services.find(s => s.id === initialServiceId);
      if (service) {
        setSelectedService(service);
        setStep('staff');
      }
    }
  }, [initialServiceId, services]);

  useEffect(() => {
    if (!selectedStaff || !selectedDate || !selectedService || !firestore) {
      setAvailableSlots([]);
      return;
    }

    const checkSlots = async () => {
      setIsCheckingSlots(true);
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
          // CORRECCIÓN: calculateEndTime se importa de @/models/booking
          const endTime = calculateEndTime(startTime, selectedService.durationMinutes);
          return isSlotAvailable({ start: startTime, end: endTime }, availability, existingRes).available;
        });

        setAvailableSlots(validSlots);
      } finally {
        setIsCheckingSlots(false);
      }
    };

    checkSlots();
  }, [selectedStaff, selectedDate, selectedService, businessId, firestore]);

  const handleConfirm = async () => {
    if (!selectedService || !selectedStaff || !selectedDate || !selectedTime) return;
    setIsSubmitting(true);
    
    try {
      const result = await confirmPublicBooking(businessId, {
        customerName: formData.name,
        customerPhone: formData.phone,
        customerEmail: formData.email,
        serviceId: selectedService.id,
        staffId: selectedStaff.id,
        date: selectedDate,
        startTime: selectedTime,
        endTime: calculateEndTime(selectedTime, selectedService.durationMinutes),
        price: selectedService.price,
        notes: formData.notes
      });

      if (result.success) {
        setStep('success');
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo procesar la reserva.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  if (step === 'success') {
    return (
      <div className="max-w-md mx-auto py-20 text-center animate-in zoom-in duration-500">
        <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 mb-2">¡Reserva Solicitada!</h2>
        <p className="text-muted-foreground mb-8">Hemos recibido tu solicitud. Te enviaremos un mensaje de confirmación por WhatsApp muy pronto.</p>
        <Button onClick={() => window.location.reload()} className="w-full h-12 font-black rounded-xl">Agendar otra cita</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Indicador de pasos */}
      <div className="flex items-center justify-between px-4">
        {[
          { id: 'service', label: 'Servicio', icon: Tag },
          { id: 'staff', label: 'Profesional', icon: UserCheck },
          { id: 'time', label: 'Horario', icon: Clock },
          { id: 'details', label: 'Datos', icon: User }
        ].map((s, i) => {
          const isActive = step === s.id;
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                isActive ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110" : "bg-muted text-muted-foreground"
              )}>
                <s.icon className="h-4 w-4" />
              </div>
              <span className={cn("hidden md:block text-xs font-black uppercase tracking-widest", isActive ? "text-primary" : "text-muted-foreground")}>
                {s.label}
              </span>
              {i < 3 && <ChevronRight className="hidden md:block h-3 w-3 text-muted-foreground/30 mx-2" />}
            </div>
          );
        })}
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
        <CardContent className="p-8">
          {/* PASO 1: SERVICIOS */}
          {step === 'service' && (
            <div className="space-y-6 animate-in slide-in-from-right-3 duration-400">
              <h3 className="text-2xl font-black text-gray-900">¿Qué servicio necesitas?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedService(s); setStep('staff'); }}
                    className="flex items-center justify-between p-6 rounded-3xl border-2 border-transparent bg-muted/30 hover:bg-primary/5 hover:border-primary/20 transition-all text-left group"
                  >
                    <div>
                      <p className="font-black text-gray-900 text-lg">{s.name}</p>
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{s.durationMinutes} minutos</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-primary text-lg">{formatCurrency(s.price)}</p>
                      <ChevronRight className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-all ml-auto" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASO 2: STAFF */}
          {step === 'staff' && (
            <div className="space-y-6 animate-in slide-in-from-right-3 duration-400">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStep('service')}><ChevronLeft className="h-5 w-5"/></Button>
                <h3 className="text-2xl font-black text-gray-900">Selecciona un profesional</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {staff.filter(s => s.assignedServiceIds.includes(selectedService!.id)).map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedStaff(s); setStep('time'); }}
                    className="flex flex-col items-center p-8 rounded-3xl border-2 border-transparent bg-muted/30 hover:bg-primary/5 hover:border-primary/20 transition-all group"
                  >
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                    <p className="font-black text-gray-900">{s.name}</p>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">{s.specialty || 'Especialista'}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PASO 3: TIEMPO */}
          {step === 'time' && (
            <div className="space-y-6 animate-in slide-in-from-right-3 duration-400">
               <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStep('staff')}><ChevronLeft className="h-5 w-5"/></Button>
                <h3 className="text-2xl font-black text-gray-900">¿Cuándo te gustaría venir?</h3>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Selecciona la fecha</Label>
                  <Input 
                    type="date" 
                    min={new Date().toISOString().split('T')[0]} 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="h-14 rounded-2xl border-2 text-lg font-bold"
                  />
                </div>
                <div className="space-y-4">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Turnos disponibles</Label>
                  {isCheckingSlots ? (
                    <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-3xl bg-muted/20">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : selectedDate && availableSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {availableSlots.map(time => (
                        <button
                          key={time}
                          onClick={() => { setSelectedStartTime(time); setStep('details'); }}
                          className="h-11 rounded-xl border-2 border-transparent bg-muted/50 font-black hover:bg-primary/5 hover:border-primary/20 transition-all text-sm"
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-3xl bg-muted/10 text-muted-foreground text-center p-6">
                      <CalendarIcon className="h-8 w-8 mb-2 opacity-20" />
                      <p className="text-xs font-bold">Selecciona una fecha para ver los turnos libres.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PASO 4: DATOS */}
          {step === 'details' && (
            <div className="space-y-8 animate-in slide-in-from-right-3 duration-400">
               <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setStep('time')}><ChevronLeft className="h-5 w-5"/></Button>
                <h3 className="text-2xl font-black text-gray-900">Tus datos de contacto</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="font-bold flex items-center gap-2"><User className="h-4 w-4" /> Nombre Completo *</Label>
                    <Input placeholder="Tu nombre..." value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold flex items-center gap-2"><Smartphone className="h-4 w-4" /> WhatsApp *</Label>
                    <Input placeholder="300 123 4567..." value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="h-12 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold flex items-center gap-2"><Mail className="h-4 w-4" /> Email (Opcional)</Label>
                    <Input type="email" placeholder="tu@correo.com..." value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="h-12 rounded-xl" />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="font-black text-xs uppercase tracking-widest text-muted-foreground">Resumen de tu Reserva</CardTitle>
                  <div className="p-6 bg-primary/5 rounded-3xl border-2 border-primary/10 space-y-4">
                    <div className="flex justify-between border-b pb-4">
                      <span className="text-sm font-bold text-muted-foreground">Servicio</span>
                      <span className="font-black text-gray-900">{selectedService?.name}</span>
                    </div>
                    <div className="flex justify-between border-b pb-4">
                      <span className="text-sm font-bold text-muted-foreground">Fecha</span>
                      <span className="font-black text-gray-900">{format(new Date(selectedDate + 'T00:00:00'), "d 'de' MMMM", { locale: es })}</span>
                    </div>
                    <div className="flex justify-between border-b pb-4">
                      <span className="text-sm font-bold text-muted-foreground">Hora</span>
                      <span className="font-black text-gray-900">{selectedTime}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm font-bold text-muted-foreground">Total</span>
                      <span className="text-2xl font-black text-primary">{formatCurrency(selectedService?.price || 0)}</span>
                    </div>
                  </div>
                  <Button 
                    className="w-full h-14 text-lg font-black shadow-2xl rounded-2xl" 
                    onClick={handleConfirm}
                    disabled={isSubmitting || !formData.name || !formData.phone}
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CalendarDays className="mr-2 h-5 w-5" />}
                    Confirmar Reserva
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <p className="text-[10px] font-black uppercase text-center text-muted-foreground tracking-[0.2em]">Agendamiento Seguro • Markix SaaS</p>
    </div>
  );
}