'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Loader2,
  Tag,
  UserCheck,
  Smartphone,
  Mail,
  Info
} from 'lucide-react';
import { cn, normalizePhoneNumber } from '@/lib/utils';
import { format, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { generateTimeSlots, isSlotAvailable } from '@/lib/booking-engine';
import { calculateEndTime, type BookingService, type BookingStaff, type BookingAvailability, type Reservation } from '@/models/booking';
import { confirmPublicBooking } from '@/actions/public-booking';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface BookingWizardProps {
  businessId: string;
  services: BookingService[];
  staff: BookingStaff[];
  initialServiceId?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

export function BookingWizard({ businessId, services, staff, initialServiceId }: BookingWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isMounted, setIsMounted] = useState(false);

  // Estados de Selección
  const [selectedService, setSelectedService] = useState<BookingService | null>(
    initialServiceId ? (services.find(s => s.id === initialServiceId) || null) : null
  );
  const [selectedStaff, setSelectedStaff] = useState<BookingStaff | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState({ name: '', phone: '', email: '', notes: '' });

  // Estados de Carga
  const [isCheckingSlots, setIsCheckingSlots] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reservationResult, setReservationResult] = useState<{ id: string } | null>(null);

  // Pre-selección automática si viene de enlace directo
  useEffect(() => {
    setIsMounted(true);
    if (initialServiceId && selectedService && step === 1) {
      setStep(2);
    }
  }, [initialServiceId, selectedService, step]);

  // Obtener slots disponibles cuando cambia fecha o profesional
  useEffect(() => {
    if (!selectedDate || !selectedStaff || !selectedService) return;

    const fetchSlots = async () => {
      setIsCheckingSlots(true);
      try {
        const dayOfWeek = selectedDate.getDay();
        const dateStr = format(selectedDate, 'yyyy-MM-dd');

        const res = await fetch(`/api/booking/available-slots?businessId=${businessId}&staffId=${selectedStaff.id}&date=${dateStr}&dayOfWeek=${dayOfWeek}&duration=${selectedService.durationMinutes}`);
        const data = await res.json();
        
        if (data.success) {
          setAvailableSlots(data.slots);
        } else {
          setAvailableSlots([]);
        }
      } catch (e) {
        setAvailableSlots([]);
      } finally {
        setIsCheckingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedDate, selectedStaff, selectedService, businessId]);

  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedDate || !selectedSlot || !customerData.name || !customerData.phone) return;

    setIsSubmitting(true);
    try {
      const data = {
        serviceId: selectedService.id,
        staffId: selectedStaff?.id || '',
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime: selectedSlot,
        endTime: calculateEndTime(selectedSlot, selectedService.durationMinutes),
        customerName: customerData.name,
        customerPhone: customerData.phone,
        customerEmail: customerData.email,
        notes: customerData.notes,
        price: selectedService.price
      };

      const result = await confirmPublicBooking(businessId, data);
      if (result.success) {
        setReservationResult({ id: result.reservationId! });
        setStep(5);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Ocurrió un error al procesar la reserva.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPrice = (price: number) => {
    if (!isMounted) return "...";
    return formatCurrency(price);
  };

  if (reservationResult) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-6 animate-in zoom-in duration-500">
        <div className="flex justify-center">
            <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <CheckCircle2 className="h-14 w-14" />
            </div>
        </div>
        <div className="space-y-2">
            <h1 className="text-3xl font-black text-gray-900">¡Cita Solicitada!</h1>
            <p className="text-muted-foreground">Tu solicitud ha sido enviada con éxito. Te confirmaremos por WhatsApp en breve.</p>
        </div>
        <Card className="border-2 border-dashed">
            <CardContent className="p-4 text-sm font-mono text-muted-foreground">
                Cód. Seguimiento: #{reservationResult.id.slice(-8).toUpperCase()}
            </CardContent>
        </Card>
        <Button onClick={() => window.location.reload()} className="w-full h-12 font-black text-lg shadow-lg">Finalizar</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Indicador de pasos */}
      <div className="flex items-center justify-between px-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center">
            <div className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center font-black transition-all",
              step === i ? "bg-primary text-white shadow-lg scale-110" : 
              step > i ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
            )}>
              {step > i ? <CheckCircle2 className="h-6 w-6" /> : i}
            </div>
            {i < 4 && <div className={cn("h-1 w-12 mx-2 rounded-full", step > i ? "bg-green-500" : "bg-muted")} />}
          </div>
        ))}
      </div>

      <div className="min-h-[500px]">
        {/* PASO 1: SERVICIO */}
        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-gray-900">¿Qué servicio necesitas?</h2>
                <p className="text-muted-foreground">Selecciona el tratamiento o consulta que deseas agendar.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {services.map(service => (
                <Card 
                  key={service.id} 
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary/50 border-2",
                    selectedService?.id === service.id ? "border-primary bg-primary/5 shadow-md" : "border-transparent"
                  )}
                  onClick={() => { setSelectedService(service); setStep(2); }}
                >
                  <CardContent className="p-6 flex justify-between items-center">
                    <div className="space-y-1">
                        <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-widest">{service.category || 'General'}</Badge>
                        <h3 className="font-bold text-lg">{service.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" /> {service.durationMinutes} minutos
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-black text-primary">{renderPrice(service.price)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* PASO 2: ESPECIALISTA */}
        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-gray-900">Elige un Profesional</h2>
                <p className="text-muted-foreground">Selecciona quién te atenderá para el servicio de {selectedService?.name}.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {staff.filter(s => s.assignedServiceIds.includes(selectedService?.id || '')).map(s => (
                <Card 
                  key={s.id}
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary/50 border-2",
                    selectedStaff?.id === s.id ? "border-primary bg-primary/5 shadow-md" : "border-transparent"
                  )}
                  onClick={() => { setSelectedStaff(s); setStep(3); }}
                >
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                        <User className="h-8 w-8" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">{s.name}</h3>
                        <p className="text-sm text-muted-foreground">{s.specialty || 'Especialista'}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button variant="ghost" onClick={() => setStep(1)} className="font-bold text-muted-foreground">
                <ChevronLeft className="mr-2 h-4 w-4" /> Cambiar Servicio
            </Button>
          </div>
        )}

        {/* PASO 3: FECHA Y HORA */}
        {step === 3 && (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-gray-900">Agenda tu Turno</h2>
                <p className="text-muted-foreground">Selecciona el día y la hora de tu preferencia.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Selector de Fecha */}
              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Próximos días disponibles</Label>
                <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: 14 }).map((_, i) => {
                        const date = addDays(new Date(), i);
                        const isSelected = selectedDate && isSameDay(date, selectedDate);
                        return (
                            <button
                                key={i}
                                onClick={() => setSelectedDate(date)}
                                className={cn(
                                    "p-3 rounded-2xl border-2 text-center transition-all",
                                    isSelected ? "bg-primary border-primary text-white shadow-lg" : "bg-white border-gray-100 hover:border-primary/30"
                                )}
                            >
                                <p className="text-[10px] uppercase font-bold opacity-70">{format(date, 'EEE', { locale: es })}</p>
                                <p className="text-lg font-black">{format(date, 'd')}</p>
                                <p className="text-[10px] font-medium">{format(date, 'MMM', { locale: es })}</p>
                            </button>
                        );
                    })}
                </div>
              </div>

              {/* Selector de Hora */}
              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Horas disponibles</Label>
                {isCheckingSlots ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-xs font-bold text-muted-foreground uppercase">Verificando agenda...</p>
                    </div>
                ) : !selectedDate ? (
                    <div className="p-8 text-center text-muted-foreground italic text-sm">Primero selecciona un día.</div>
                ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                        {availableSlots.map(slot => (
                            <button
                                key={slot}
                                onClick={() => setSelectedSlot(slot)}
                                className={cn(
                                    "py-2 px-3 rounded-xl border-2 font-bold text-sm transition-all",
                                    selectedSlot === slot ? "bg-primary border-primary text-white" : "bg-white border-gray-50 hover:border-primary/20"
                                )}
                            >
                                {slot}
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="p-8 text-center bg-orange-50 rounded-2xl border-2 border-dashed border-orange-100">
                        <p className="text-sm font-bold text-orange-700">Sin turnos para este día</p>
                        <p className="text-xs text-orange-600/70">Intenta seleccionando otra fecha o profesional.</p>
                    </div>
                )}
              </div>
            </div>
            <div className="flex justify-between pt-6 border-t">
                <Button variant="ghost" onClick={() => setStep(2)} className="font-bold text-muted-foreground">
                    <ChevronLeft className="mr-2 h-4 w-4" /> Cambiar Profesional
                </Button>
                <Button onClick={() => setStep(4)} disabled={!selectedSlot} className="font-black px-10 h-12 shadow-lg">
                    Continuar <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
          </div>
        )}

        {/* PASO 4: DATOS CLIENTE */}
        {step === 4 && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-right-4">
             <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-gray-900">Tus Datos de Contacto</h2>
                <p className="text-muted-foreground">Completa tu información para confirmar tu cita de {selectedService?.name}.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 bg-white p-8 rounded-[2rem] border shadow-xl">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 font-bold text-xs uppercase text-muted-foreground">
                            <User className="h-3 w-3" /> Nombre Completo *
                        </Label>
                        <Input 
                            value={customerData.name}
                            onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                            placeholder="Ej: Juan Pérez"
                            className="h-12 bg-muted/20 border-none text-lg font-medium"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-bold text-xs uppercase text-muted-foreground">
                                <Smartphone className="h-3 w-3" /> WhatsApp / Celular *
                            </Label>
                            <Input 
                                value={customerData.phone}
                                onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                                placeholder="300 123 4567"
                                className="h-12 bg-muted/20 border-none text-lg font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-bold text-xs uppercase text-muted-foreground">
                                <Mail className="h-3 w-3" /> Correo Electrónico
                            </Label>
                            <Input 
                                type="email"
                                value={customerData.email}
                                onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                                placeholder="tu@correo.com"
                                className="h-12 bg-muted/20 border-none text-lg font-medium"
                            />
                        </div>
                    </div>
                    <div className="space-y-2 pt-4">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Notas Adicionales</Label>
                        <Textarea 
                            value={customerData.notes}
                            onChange={(e) => setCustomerData({...customerData, notes: e.target.value})}
                            placeholder="Algún requerimiento especial o detalle..."
                            className="bg-muted/20 border-none resize-none h-24"
                        />
                    </div>
                </div>
            </div>

            <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10 flex gap-4 items-start">
                 <div className="p-2 bg-white rounded-xl shadow-sm"><Info className="h-5 w-5 text-primary" /></div>
                 <div className="space-y-1">
                    <p className="text-sm font-black text-primary">Resumen de tu Turno</p>
                    <p className="text-xs font-medium text-gray-600">
                        {selectedService?.name} con {selectedStaff?.name} el <strong>{format(selectedDate!, 'd MMMM', { locale: es })}</strong> a las <strong>{selectedSlot}</strong>.
                    </p>
                 </div>
            </div>

            <div className="flex justify-between pt-6">
                <Button variant="ghost" onClick={() => setStep(3)} className="font-bold text-muted-foreground" disabled={isSubmitting}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Volver al Calendario
                </Button>
                <Button 
                    onClick={handleConfirmBooking} 
                    disabled={isSubmitting || !customerData.name || !customerData.phone}
                    className="font-black px-12 h-14 text-lg shadow-2xl shadow-primary/20 bg-primary hover:bg-primary/90"
                >
                    {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UserCheck className="mr-2 h-5 w-5" />}
                    Confirmar Reserva
                </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}