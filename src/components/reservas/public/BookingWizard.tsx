'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, doc } from 'firebase/firestore';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  ChevronRight, 
  ChevronLeft, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  UserCheck, 
  Sparkles,
  Info
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { TimeStep } from './TimeStep';
import { confirmPublicBooking } from '@/actions/public-booking';
import type { BookingService, BookingStaff, BookingAvailability, Reservation } from '@/models/booking';

/**
 * @fileOverview Asistente de agendamiento público de 4 pasos.
 * Corregido para soportar navegación de meses y validación de tipos en disponibilidad.
 */

type Step = 'service' | 'staff' | 'time' | 'details' | 'success';

interface BookingWizardProps {
  businessId: string;
  services: BookingService[];
  staff: BookingStaff[];
  initialServiceId?: string;
}

export function BookingWizard({ businessId, services, staff, initialServiceId }: BookingWizardProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  // --- ESTADO DEL ASISTENTE ---
  const [step, setStep] = useState<Step>(initialServiceId ? 'staff' : 'service');
  const [selectedService, setSelectedService] = useState<BookingService | null>(
    initialServiceId ? (services.find(s => s.id === initialServiceId) || null) : null
  );
  const [selectedStaff, setSelectedStaff] = useState<BookingStaff | 'any'>('any');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [customerData, setCustomerData] = useState({ name: '', phone: '', email: '', notes: '' });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  // --- DATA FETCHING (Disponibilidad y Reservas ocupadas) ---
  const availQuery = useMemoFirebase(() => collection(firestore, `businesses/${businessId}/bookingAvailability`), [businessId, firestore]);
  const resQuery = useMemoFirebase(() => collection(firestore, `businesses/${businessId}/reservations`), [businessId, firestore]);

  const { data: availability } = useCollection<BookingAvailability>(availQuery);
  const { data: reservations } = useCollection<Reservation>(resQuery);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime) return;
    setIsSubmitting(true);
    try {
      const result = await confirmPublicBooking(businessId, {
        serviceId: selectedService.id,
        staffId: selectedStaff === 'any' ? '' : selectedStaff.id,
        date: selectedDate,
        startTime: selectedTime,
        customerName: customerData.name,
        customerPhone: customerData.phone,
        customerEmail: customerData.email,
        notes: customerData.notes,
        price: selectedService.price,
        endTime: '', // Se calcula en el servidor por seguridad
      });

      if (result.success) {
        setStep('success');
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Fallo de conexión', description: 'No pudimos procesar tu reserva.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) return null;

  if (step === 'success') {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-6 animate-in zoom-in duration-500">
        <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-25"></div>
            <div className="relative bg-green-500 rounded-full w-full h-full flex items-center justify-center shadow-xl shadow-green-100">
                <CheckCircle2 className="h-12 w-12 text-white" />
            </div>
        </div>
        <div className="space-y-2">
            <h2 className="text-3xl font-black text-gray-900">¡Reserva Solicitada!</h2>
            <p className="text-muted-foreground font-medium">Hemos recibido tus datos. Te enviaremos una confirmación por WhatsApp en unos minutos.</p>
        </div>
        <Card className="bg-muted/30 border-none shadow-none p-4 rounded-2xl">
            <div className="text-left text-sm space-y-2">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Servicio:</span>
                    <span className="font-bold">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha:</span>
                    <span className="font-bold">{selectedDate}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Hora:</span>
                    <span className="font-bold">{selectedTime}</span>
                </div>
            </div>
        </Card>
        <Button onClick={() => window.location.reload()} variant="outline" className="w-full h-12 font-bold rounded-xl">Volver al inicio</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Paso 1: Selección de Servicio */}
      {step === 'service' && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-gray-900">¿Qué servicio necesitas?</h2>
            <p className="text-muted-foreground">Elige el tratamiento o consulta que deseas agendar.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map(s => (
              <button 
                key={s.id}
                onClick={() => { setSelectedService(s); setStep('staff'); }}
                className="group p-6 bg-white rounded-[2rem] border-2 border-gray-100 text-left hover:border-primary/30 hover:shadow-xl transition-all flex justify-between items-center"
              >
                <div className="space-y-1">
                    <p className="font-black text-gray-900 text-lg group-hover:text-primary transition-colors">{s.name}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {s.durationMinutes} min</span>
                        <span className="font-bold text-primary">{formatCurrency(s.price)}</span>
                    </div>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="h-6 w-6" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Paso 2: Selección de Profesional */}
      {step === 'staff' && (
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => setStep('service')} className="pl-0 text-muted-foreground hover:text-primary"><ChevronLeft className="mr-2 h-4 w-4" /> Cambiar servicio</Button>
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-gray-900">Elige un especialista</h2>
            <p className="text-muted-foreground">Selecciona a tu profesional preferido o elige cualquiera disponible.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             <button 
                onClick={() => { setSelectedStaff('any'); setStep('time'); }}
                className={cn(
                    "p-6 rounded-[2rem] border-2 text-center transition-all",
                    selectedStaff === 'any' ? "border-primary bg-primary/5" : "bg-white border-gray-100 hover:border-primary/20"
                )}
             >
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3 text-primary"><Sparkles className="h-8 w-8" /></div>
                <p className="font-black">Cualquier Profesional</p>
                <p className="text-xs text-muted-foreground">Asignación automática</p>
             </button>

             {staff.filter(s => s.assignedServiceIds.includes(selectedService?.id || '') && s.isActive).map(s => (
                <button 
                    key={s.id}
                    onClick={() => { setSelectedStaff(s); setStep('time'); }}
                    className={cn(
                        "p-6 rounded-[2rem] border-2 text-center transition-all",
                        selectedStaff !== 'any' && selectedStaff.id === s.id ? "border-primary bg-primary/5" : "bg-white border-gray-100 hover:border-primary/20"
                    )}
                >
                    <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3 text-muted-foreground"><UserCheck className="h-8 w-8" /></div>
                    <p className="font-black">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.specialty || 'Especialista'}</p>
                </button>
             ))}
          </div>
        </div>
      )}

      {/* Paso 3: Selección de Fecha y Hora */}
      {step === 'time' && selectedService && (
        <div className="space-y-6">
            <Button variant="ghost" onClick={() => setStep('staff')} className="pl-0 text-muted-foreground hover:text-primary"><ChevronLeft className="mr-2 h-4 w-4" /> Cambiar especialista</Button>
            <TimeStep 
                businessId={businessId}
                selectedService={selectedService}
                selectedStaff={selectedStaff}
                availability={availability || []}
                reservations={reservations || []}
                staffList={staff}
                onSelect={(d, t) => { setSelectedDate(d); setSelectedTime(t); setStep('details'); }}
            />
        </div>
      )}

      {/* Paso 4: Datos del Cliente */}
      {step === 'details' && (
        <div className="max-w-2xl mx-auto space-y-6">
            <Button variant="ghost" onClick={() => setStep('time')} className="pl-0 text-muted-foreground hover:text-primary"><ChevronLeft className="mr-2 h-4 w-4" /> Cambiar horario</Button>
            <div className="space-y-1">
                <h2 className="text-3xl font-black text-gray-900">Tus Datos</h2>
                <p className="text-muted-foreground">Completa la información para confirmar tu cita.</p>
            </div>
            
            <Card className="rounded-[2.5rem] shadow-xl border-none overflow-hidden">
                <CardContent className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Nombre Completo</Label>
                            <Input placeholder="Ej: Juan Pérez" value={customerData.name} onChange={e => setCustomerData({...customerData, name: e.target.value})} className="h-12 bg-muted/20 border-none rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">WhatsApp</Label>
                            <Input placeholder="300 123 4567" value={customerData.phone} onChange={e => setCustomerData({...customerData, phone: e.target.value})} className="h-12 bg-muted/20 border-none rounded-xl" />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Correo Electrónico</Label>
                            <Input type="email" placeholder="tu@correo.com" value={customerData.email} onChange={e => setCustomerData({...customerData, email: e.target.value})} className="h-12 bg-muted/20 border-none rounded-xl" />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Notas Adicionales</Label>
                            <Textarea placeholder="Cuéntanos algún detalle..." value={customerData.notes} onChange={e => setCustomerData({...customerData, notes: e.target.value})} className="h-32 bg-muted/20 border-none rounded-xl resize-none" />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="p-8 bg-muted/30 border-t flex flex-col gap-4">
                    <div className="flex items-start gap-3 p-4 bg-white rounded-2xl border shadow-sm w-full">
                        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <p className="text-[10px] leading-relaxed text-muted-foreground font-medium uppercase tracking-tight">
                            Al confirmar, recibirás una solicitud de confirmación por WhatsApp. La reserva estará sujeta a la aprobación del establecimiento.
                        </p>
                    </div>
                    <Button 
                        onClick={handleConfirmBooking} 
                        disabled={isSubmitting || !customerData.name || !customerData.phone} 
                        className="w-full h-14 text-lg font-black shadow-2xl rounded-2xl shadow-primary/20"
                    >
                        {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                        Confirmar mi cita
                    </Button>
                </CardFooter>
            </Card>
        </div>
      )}
    </div>
  );
}
