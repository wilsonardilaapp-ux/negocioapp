'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  ChevronRight, 
  ArrowLeft, 
  User, 
  Clock, 
  Calendar, 
  Tag, 
  UserCheck,
  Smartphone,
  Mail,
  Loader2,
  Sparkles
} from 'lucide-react';
import type { BookingService, BookingStaff, BookingAvailability, Reservation } from '@/models/booking';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { TimeStep } from './TimeStep';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { confirmPublicBooking } from '@/actions/public-booking';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type Step = 1 | 2 | 3 | 4 | 5;

interface BookingWizardProps {
  businessId: string;
  services: BookingService[];
  staff: BookingStaff[];
  initialServiceId?: string;
}

export function BookingWizard({ businessId, services, staff, initialServiceId }: BookingWizardProps) {
  const [step, setStep] = useState<Step>(1);
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isMounted, setIsMounted] = useState(false);

  // Estados de selección
  const [selectedService, setSelectedService] = useState<BookingService | null>(
    services.find(s => s.id === initialServiceId) || null
  );
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  // Datos de cliente
  const [customerData, setCustomerData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (initialServiceId && selectedService) setStep(2);
  }, [initialServiceId, selectedService]);

  // --- CONSULTAS DE DISPONIBILIDAD ---
  const availQuery = useMemoFirebase(() => collection(firestore, `businesses/${businessId}/bookingAvailability`), [businessId, firestore]);
  const resQuery = useMemoFirebase(() => {
    if (!selectedDate) return null;
    const dateStr = selectedDate.toISOString().split('T')[0];
    return query(
      collection(firestore, `businesses/${businessId}/reservations`),
      where('date', '==', dateStr)
    );
  }, [businessId, firestore, selectedDate]);

  const { data: availabilityList } = useCollection<BookingAvailability>(availQuery);
  const { data: existingReservations } = useCollection<Reservation>(resQuery);

  const formatCurrency = (val: number) => {
    if (!isMounted) return `$${val}`;
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
  };

  const handleConfirm = async () => {
    if (!selectedService || !selectedDate || !selectedTime) return;
    setIsSubmitting(true);
    
    const result = await confirmPublicBooking(businessId, {
      ...customerData,
      customerName: customerData.name,
      customerPhone: customerData.phone,
      customerEmail: customerData.email,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      staffId: selectedStaffId,
      staffName: staff.find(s => s.id === selectedStaffId)?.name || 'Cualquier Profesional',
      date: selectedDate.toISOString().split('T')[0],
      startTime: selectedTime,
      price: selectedService.price,
      durationMinutes: selectedService.durationMinutes
    });

    if (result.success) {
      setStep(5);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setIsSubmitting(false);
  };

  if (!isMounted) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Indicador de pasos */}
      <div className="flex items-center justify-between px-4">
        {[1, 2, 3, 4].map(num => (
          <div key={num} className="flex flex-col items-center gap-2">
            <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center font-black transition-all",
                step === num ? "bg-primary text-white shadow-lg scale-110" : 
                step > num ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
            )}>
                {step > num ? <CheckCircle2 className="h-5 w-5" /> : num}
            </div>
            <span className={cn("text-[9px] font-black uppercase tracking-widest", step === num ? "text-primary" : "text-muted-foreground opacity-50")}>
                {num === 1 ? 'Servicio' : num === 2 ? 'Experto' : num === 3 ? 'Horario' : 'Datos'}
            </span>
          </div>
        ))}
      </div>

      {/* PASO 1: SERVICIOS */}
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map(s => (
            <Card key={s.id} className="group hover:border-primary transition-all cursor-pointer rounded-3xl" onClick={() => { setSelectedService(s); setStep(2); }}>
              <CardContent className="p-6 flex justify-between items-center">
                <div className="space-y-1">
                  <h4 className="font-black text-lg">{s.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {s.durationMinutes} min
                    <span className="mx-1">•</span>
                    <Tag className="h-3 w-3" /> {s.category || 'General'}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-primary font-black text-lg">{formatCurrency(s.price)}</p>
                  <ChevronRight className="h-5 w-5 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* PASO 2: STAFF */}
      {step === 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-right-3">
          <Card className="hover:border-primary transition-all cursor-pointer rounded-3xl group border-2 border-dashed border-muted" onClick={() => { setSelectedStaffId('any'); setStep(3); }}>
             <CardContent className="p-8 text-center space-y-4">
                <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary group-hover:scale-110 transition-transform"><UserCheck className="h-8 w-8" /></div>
                <div className="space-y-1">
                    <h4 className="font-black text-xl text-gray-900">Cualquier Profesional</h4>
                    <p className="text-sm text-muted-foreground">Veremos todas las horas disponibles del equipo.</p>
                </div>
             </CardContent>
          </Card>
          {staff.filter(s => s.assignedServiceIds.includes(selectedService?.id!)).map(s => (
            <Card key={s.id} className="hover:border-primary transition-all cursor-pointer rounded-3xl" onClick={() => { setSelectedStaffId(s.id); setStep(3); }}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center"><User className="h-6 w-6 text-muted-foreground" /></div>
                <div><h4 className="font-bold">{s.name}</h4><p className="text-xs text-muted-foreground">{s.specialty || 'Especialista'}</p></div>
                <ChevronRight className="h-5 w-5 ml-auto text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* PASO 3: TIME SELECTION */}
      {step === 3 && selectedService && (
        <TimeStep 
            businessId={businessId}
            selectedService={selectedService}
            selectedStaffId={selectedStaffId}
            availability={availabilityList || []}
            existingReservations={existingReservations || []}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onDateSelect={setSelectedDate}
            onTimeSelect={setSelectedTime}
        />
      )}

      {/* PASO 4: CUSTOMER DATA */}
      {step === 4 && (
        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
            <CardHeader className="bg-primary/5 p-8 border-b">
                <CardTitle className="text-2xl font-black">Tus Datos de Contacto</CardTitle>
                <CardDescription>Completa la información para confirmar tu asistencia.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Nombre Completo</Label>
                        <Input value={customerData.name} onChange={e => setCustomerData({...customerData, name: e.target.value})} placeholder="Ej: Juan Pérez" className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-primary" /> WhatsApp</Label>
                        <Input value={customerData.phone} onChange={e => setCustomerData({...customerData, phone: e.target.value})} placeholder="300 123 4567" className="h-12 rounded-xl" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Correo Electrónico</Label>
                    <Input value={customerData.email} onChange={e => setCustomerData({...customerData, email: e.target.value})} placeholder="tu@email.com" className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                    <Label>Notas Adicionales</Label>
                    <Textarea value={customerData.notes} onChange={e => setCustomerData({...customerData, notes: e.target.value})} placeholder="Información que debamos saber..." className="h-24 resize-none rounded-xl" />
                </div>
            </CardContent>
            <CardFooter className="bg-muted/30 p-8 border-t">
                <Button 
                    className="w-full h-14 text-lg font-black shadow-xl shadow-primary/20 rounded-2xl"
                    onClick={handleConfirm}
                    disabled={isSubmitting || !customerData.name || !customerData.phone}
                >
                    {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                    Confirmar mi cita
                </Button>
            </CardFooter>
        </Card>
      )}

      {/* PASO 5: SUCCESS */}
      {step === 5 && (
        <Card className="rounded-[3rem] p-12 text-center space-y-6 shadow-2xl border-none animate-in zoom-in duration-500">
            <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 ring-8 ring-green-50">
                <CheckCircle2 className="h-12 w-12" />
            </div>
            <div className="space-y-2">
                <h2 className="text-3xl font-black text-gray-900">¡Cita Agendada!</h2>
                <p className="text-muted-foreground font-medium">Hemos recibido tu reserva exitosamente. Te hemos enviado una confirmación por WhatsApp.</p>
            </div>
            <div className="p-6 bg-muted/30 rounded-3xl border-2 border-dashed space-y-3">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground font-bold">Servicio</span><span className="font-black">{selectedService?.name}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground font-bold">Fecha</span><span className="font-black">{selectedDate ? format(selectedDate, 'PPP', { locale: es }) : ''}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground font-bold">Hora</span><span className="font-black">{selectedTime}</span></div>
            </div>
            <Button variant="outline" className="font-bold h-12 px-10 rounded-2xl" onClick={() => window.location.reload()}>Agendar otra cita</Button>
        </Card>
      )}

      {/* Navegación Inferior */}
      {step > 1 && step < 5 && (
        <div className="flex justify-between items-center pt-8">
            <Button variant="ghost" onClick={() => setStep(prev => (prev - 1) as Step)} className="font-bold text-gray-500 gap-2">
                <ArrowLeft className="h-4 w-4" /> Volver
            </Button>
            {step === 3 && selectedTime && (
                <Button onClick={() => setStep(4)} className="font-black px-10 rounded-xl shadow-lg">Continuar <ChevronRight className="ml-2 h-4 w-4" /></Button>
            )}
        </div>
      )}
    </div>
  );
}
