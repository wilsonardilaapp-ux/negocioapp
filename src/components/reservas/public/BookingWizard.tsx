'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Loader2, 
  Phone, 
  Mail, 
  Tag, 
  AlertCircle,
  UserCheck 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase/provider';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { BookingService, BookingStaff, BookingAvailability, Reservation } from '@/models/booking';
import { calculateEndTime } from '@/models/booking';
import { generateTimeSlots, isSlotAvailable } from '@/lib/booking-engine';
import { confirmPublicBooking } from '@/actions/public-booking';
import { cn, normalizePhoneNumber } from '@/lib/utils';

interface BookingWizardProps {
  businessId: string;
  services: BookingService[];
  staff: BookingStaff[];
  initialServiceId?: string;
}

type Step = 'service' | 'staff' | 'datetime' | 'confirm';

export function BookingWizard({ businessId, services, staff, initialServiceId }: BookingWizardProps) {
  const { toast } = useToast();
  const firestore = useFirestore();

  // --- ESTADOS DEL FLUJO ---
  const [currentStep, setCurrentStep] = useState<Step>('service');
  const [selectedService, setSelectedService] = useState<BookingService | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<BookingStaff | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  const [customerData, setCustomerData] = useState({ name: '', phone: '', email: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- LÓGICA DE INICIO (DEEP LINKING) ---
  useEffect(() => {
    if (initialServiceId) {
      const service = services.find(s => s.id === initialServiceId);
      if (service) {
        setSelectedService(service);
        setCurrentStep('staff');
      }
    }
  }, [initialServiceId, services]);

  // --- DISPONIBILIDAD ---
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  useEffect(() => {
    if (currentStep === 'datetime' && selectedDate && selectedStaff && selectedService) {
      const checkAvailability = async () => {
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
        } catch (e) {
          console.error("Error checking availability:", e);
        } finally {
          setIsLoadingSlots(false);
        }
      };
      checkAvailability();
    }
  }, [currentStep, selectedDate, selectedStaff, selectedService, businessId, firestore]);

  // --- HANDLERS ---
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
        notes: customerData.notes,
      });

      if (result.success) {
        toast({ title: '¡Reserva Exitosa!', description: 'Hemos recibido tu solicitud. Te confirmaremos por WhatsApp.' });
        window.location.href = `/catalog/${businessId}?status=success`;
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo procesar la reserva.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStaff = useMemo(() => {
    if (!selectedService) return [];
    return staff.filter(s => s.assignedServiceIds.includes(selectedService.id) && s.isActive);
  }, [selectedService, staff]);

  // --- RENDERIZADO ---
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Indicador de pasos */}
      <div className="flex items-center justify-between px-4">
        {[
          { id: 'service', label: 'Servicio', icon: Tag },
          { id: 'staff', label: 'Profesional', icon: User },
          { id: 'datetime', label: 'Horario', icon: Calendar },
          { id: 'confirm', label: 'Confirmar', icon: CheckCircle2 }
        ].map((s, idx) => {
          const isActive = currentStep === s.id;
          const isDone = ['service', 'staff', 'datetime', 'confirm'].indexOf(currentStep) > idx;
          return (
            <div key={s.id} className="flex flex-col items-center gap-2">
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center transition-all border-2",
                isActive ? "bg-primary border-primary text-white scale-110 shadow-lg shadow-primary/20" : 
                isDone ? "bg-green-500 border-green-500 text-white" : "bg-white border-gray-200 text-gray-400"
              )}>
                {isDone ? <CheckCircle2 className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
              </div>
              <span className={cn("text-[10px] font-black uppercase tracking-widest", isActive ? "text-primary" : "text-muted-foreground")}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      <Card className="border-none shadow-xl rounded-[2rem] overflow-hidden bg-white">
        <CardContent className="p-8">
          {/* STEP 1: SERVICE */}
          {currentStep === 'service' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-gray-900">¿Qué servicio necesitas?</h2>
                <p className="text-muted-foreground">Selecciona una de nuestras especialidades.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {services.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedService(s); setCurrentStep('staff'); }}
                    className="group p-6 text-left border-2 rounded-3xl transition-all hover:border-primary hover:bg-primary/5 hover:shadow-md"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-primary/10 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <Tag className="h-5 w-5" />
                      </div>
                      <Badge variant="outline" className="font-bold border-primary/20 text-primary">{s.durationMinutes} min</Badge>
                    </div>
                    <h3 className="font-black text-lg text-gray-900 mb-1">{s.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{s.description}</p>
                    <p className="text-xl font-black text-primary">${s.price.toLocaleString()}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: STAFF */}
          {currentStep === 'staff' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-gray-900">Elige a tu profesional</h2>
                <p className="text-muted-foreground">Contamos con los mejores especialistas para ti.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredStaff.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedStaff(s); setCurrentStep('datetime'); }}
                    className="group p-6 text-left border-2 rounded-3xl transition-all hover:border-primary hover:bg-primary/5 flex items-center gap-4"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      <User className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-lg text-gray-900">{s.name}</h3>
                      <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{s.specialty || 'Especialista'}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-all" />
                  </button>
                ))}
              </div>
              <Button variant="ghost" onClick={() => setCurrentStep('service')} className="font-bold gap-2">
                <ChevronLeft className="h-4 w-4" /> Volver a servicios
              </Button>
            </div>
          )}

          {/* STEP 3: DATETIME */}
          {currentStep === 'datetime' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-gray-900">¿Cuándo te gustaría venir?</h2>
                <p className="text-muted-foreground">Selecciona el día y la hora de tu preferencia.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Seleccionar Día</Label>
                  <Input 
                    type="date" 
                    min={new Date().toISOString().split('T')[0]} 
                    value={selectedDate}
                    onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(''); }}
                    className="h-12 text-lg font-bold rounded-xl bg-muted/20"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Turnos Disponibles</Label>
                  {isLoadingSlots ? (
                    <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                  ) : selectedDate ? (
                    availableSlots.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {availableSlots.map(time => (
                          <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={cn(
                              "h-12 rounded-xl text-sm font-black transition-all border-2",
                              selectedTime === time ? "bg-primary border-primary text-white shadow-md" : "bg-white border-gray-100 hover:border-primary/30"
                            )}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-orange-50 rounded-2xl border border-orange-100 space-y-2">
                        <AlertCircle className="h-8 w-8 text-orange-600 mx-auto" />
                        <p className="text-sm font-bold text-orange-800">No hay turnos para este día.</p>
                        <p className="text-xs text-orange-700/70">Intenta seleccionando otra fecha.</p>
                      </div>
                    )
                  ) : (
                    <div className="p-8 text-center bg-muted/30 rounded-2xl border-2 border-dashed text-muted-foreground text-sm font-medium">
                      Primero selecciona un día en el calendario.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <Button variant="ghost" onClick={() => setCurrentStep('staff')} className="font-bold gap-2">
                  <ChevronLeft className="h-4 w-4" /> Atrás
                </Button>
                <Button 
                  onClick={() => setCurrentStep('confirm')} 
                  disabled={!selectedTime}
                  className="font-black px-8 h-12 rounded-xl shadow-lg shadow-primary/10"
                >
                  Continuar <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: CONFIRM */}
          {currentStep === 'confirm' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-gray-900">Tus datos de contacto</h2>
                <p className="text-muted-foreground">Completa tu información para finalizar la reserva.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nombre Completo *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Tu nombre..." 
                          className="pl-10 h-12 bg-muted/20" 
                          value={customerData.name}
                          onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">WhatsApp *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="300 123 4567..." 
                          className="pl-10 h-12 bg-muted/20"
                          value={customerData.phone}
                          onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Correo Electrónico</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="email" 
                          placeholder="tu@correo.com" 
                          className="pl-10 h-12 bg-muted/20"
                          value={customerData.email}
                          onChange={(e) => setCustomerData({...customerData, email: e.target.value})}
                        />
                      </div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="p-6 bg-muted/30 rounded-3xl border-2 border-dashed space-y-4">
                        <h3 className="font-black text-gray-900 uppercase text-[10px] tracking-[0.2em] mb-4">Resumen del Turno</h3>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-white rounded-xl shadow-sm text-primary"><Tag className="h-4 w-4" /></div>
                                <div><p className="text-xs text-muted-foreground font-bold uppercase tracking-tight">Servicio</p><p className="font-black text-gray-900">{selectedService?.name}</p></div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-white rounded-xl shadow-sm text-primary"><UserCheck className="h-4 w-4" /></div>
                                <div><p className="text-xs text-muted-foreground font-bold uppercase tracking-tight">Especialista</p><p className="font-black text-gray-900">{selectedStaff?.name}</p></div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-white rounded-xl shadow-sm text-primary"><Clock className="h-4 w-4" /></div>
                                <div><p className="text-xs text-muted-foreground font-bold uppercase tracking-tight">Fecha y Hora</p><p className="font-black text-gray-900">{selectedDate} a las {selectedTime}</p></div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Notas Adicionales</Label>
                      <Textarea 
                        placeholder="Algún requerimiento especial..." 
                        className="bg-muted/20 resize-none h-24"
                        value={customerData.notes}
                        onChange={(e) => setCustomerData({...customerData, notes: e.target.value})}
                      />
                    </div>
                 </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <Button variant="ghost" onClick={() => setCurrentStep('datetime')} className="font-bold gap-2">
                  <ChevronLeft className="h-4 w-4" /> Atrás
                </Button>
                <Button 
                  onClick={handleConfirm} 
                  disabled={isSubmitting || !customerData.name || !customerData.phone}
                  className="font-black px-12 h-14 rounded-2xl text-lg shadow-2xl shadow-primary/20 bg-primary hover:bg-primary/90"
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <CheckCircle2 className="mr-2 h-6 w-6" />}
                  Confirmar Reserva
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="text-center text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] opacity-30">
        Reserva Segura — Markix SaaS Platform
      </div>
    </div>
  );
}