'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  Calendar, 
  Clock, 
  User, 
  ArrowRight, 
  ArrowLeft,
  Loader2,
  CalendarCheck
} from 'lucide-react';
import { ServiceStep } from './ServiceStep';
import { StaffStep } from './StaffStep';
import { TimeStep } from './TimeStep';
import { ContactStep } from './ContactStep';
import { SuccessView } from './SuccessView';
import { confirmPublicBooking } from '@/actions/public-booking';
import { useToast } from '@/hooks/use-toast';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { BookingService, BookingStaff, Reservation } from '@/models/booking';

interface BookingWizardProps {
  businessId: string;
  services: BookingService[];
  staff: BookingStaff[];
  initialServiceId?: string;
}

export type BookingData = {
  serviceId: string;
  serviceName: string;
  price: number;
  durationMinutes: number;
  staffId: string | null;
  staffName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes: string;
};

export function BookingWizard({ businessId, services, staff, initialServiceId }: BookingWizardProps) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdReservation, setCreatedReservation] = useState<Reservation | null>(null);

  const [bookingData, setBookingData] = useState<BookingData>({
    serviceId: initialServiceId || '',
    serviceName: '',
    price: 0,
    durationMinutes: 30,
    staffId: null,
    staffName: 'Cualquier Profesional',
    date: '',
    startTime: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    notes: '',
  });

  useEffect(() => {
    setMounted(true);
    if (initialServiceId) {
      const s = services.find(item => item.id === initialServiceId);
      if (s) {
        setBookingData(prev => ({
          ...prev,
          serviceId: s.id,
          serviceName: s.name,
          price: s.price,
          durationMinutes: s.durationMinutes
        }));
        setStep(2);
      }
    }
  }, [initialServiceId, services]);

  const updateData = (updates: Partial<BookingData>) => {
    setBookingData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const res = await confirmPublicBooking(businessId, bookingData);
      
      if (res.success) {
        setCreatedReservation(res.reservation as Reservation);
        setStep(5); // Éxito
      } else {
        toast({
          variant: "destructive",
          title: "Error al agendar",
          description: res.error || "No se pudo completar la reserva.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error técnico",
        description: err?.message || "Ocurrió un error inesperado al procesar la cita.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Formatea la fecha de la reserva de forma segura para evitar ReferenceError
   * y errores de zona horaria (JS Date Parsing).
   */
  const formatReservationDate = (dateVal: any) => {
    try {
      if (!dateVal) return "";
      // Si la fecha es un string YYYY-MM-DD, forzamos el horario T00 para evitar que JS reste un día por GMT
      const d = typeof dateVal === 'string' 
        ? new Date(dateVal.includes('T') ? dateVal : `${dateVal}T00:00:00`) 
        : new Date(dateVal);
      
      if (isNaN(d.getTime())) return String(dateVal);
      
      return format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
    } catch {
      return String(dateVal || "");
    }
  };

  if (!mounted) return null;

  // Pantalla de Éxito Final
  if (step === 5 && createdReservation) {
    return <SuccessView reservation={createdReservation} businessId={businessId} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Indicador de Progreso */}
      <div className="flex items-center justify-between px-4">
        {[
          { s: 1, label: 'Servicio' },
          { s: 2, label: 'Especialista' },
          { s: 3, label: 'Horario' },
          { s: 4, label: 'Confirmación' }
        ].map((item, idx) => (
          <React.Fragment key={item.s}>
            <div className="flex flex-col items-center gap-2">
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center font-black transition-all",
                step >= item.s ? "bg-primary text-white shadow-lg" : "bg-muted text-muted-foreground"
              )}>
                {step > item.s ? <CheckCircle2 className="h-6 w-6" /> : item.s}
              </div>
              <span className={cn("text-[10px] font-bold uppercase tracking-widest", step === item.s ? "text-primary" : "text-muted-foreground")}>
                {item.label}
              </span>
            </div>
            {idx < 3 && (
              <div className={cn("h-0.5 flex-1 mx-2", step > item.s ? "bg-primary" : "bg-muted")} />
            )}
          </React.Fragment>
        ))}
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
        <div className="p-8">
          {step === 1 && (
            <ServiceStep 
              services={services} 
              selectedId={bookingData.serviceId} 
              onSelect={(s) => {
                updateData({ serviceId: s.id, serviceName: s.name, price: s.price, durationMinutes: s.durationMinutes });
                handleNext();
              }} 
            />
          )}

          {step === 2 && (
            <StaffStep 
              staffList={staff.filter(s => s.assignedServiceIds.includes(bookingData.serviceId))} 
              selectedId={bookingData.staffId}
              onSelect={(s) => {
                updateData({ staffId: s?.id || 'any', staffName: s?.name || 'Cualquier Profesional' });
                handleNext();
              }}
              onBack={handleBack}
            />
          )}

          {step === 3 && (
            <TimeStep 
              businessId={businessId}
              bookingData={bookingData}
              onSelect={(date, time) => {
                updateData({ date, startTime: time });
                handleNext();
              }}
              onBack={handleBack}
            />
          )}

          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Completa tus datos</h3>
                    <ContactStep 
                      data={bookingData} 
                      onChange={updateData} 
                    />
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 bg-muted/30 rounded-3xl border-2 border-dashed space-y-4">
                       <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Resumen de tu Turno</h4>
                       <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-white rounded-xl shadow-sm"><CalendarCheck className="h-5 w-5 text-primary" /></div>
                            <div>
                               <p className="text-[10px] font-bold text-muted-foreground uppercase">Fecha y Hora</p>
                               {/* LÍNEA 253: CORREGIDA CON FORMATEO SEGURO Y LOCALIZADO */}
                               <p className="font-bold text-gray-900 capitalize">{formatReservationDate(bookingData.date)}</p>
                               <p className="text-sm font-medium text-primary">A las {bookingData.startTime}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-white rounded-xl shadow-sm"><User className="h-5 w-5 text-primary" /></div>
                            <div>
                               <p className="text-[10px] font-bold text-muted-foreground uppercase">Especialista</p>
                               <p className="font-bold text-gray-900">{bookingData.staffName}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-white rounded-xl shadow-sm"><Clock className="h-5 w-5 text-primary" /></div>
                            <div>
                               <p className="text-[10px] font-bold text-muted-foreground uppercase">Servicio</p>
                               <p className="font-bold text-gray-900">{bookingData.serviceName}</p>
                               <p className="text-xs text-muted-foreground">{bookingData.durationMinutes} minutos de duración</p>
                            </div>
                          </div>
                       </div>
                    </div>
                    
                    <Button 
                      onClick={handleConfirm} 
                      disabled={isSubmitting || !bookingData.customerName || !bookingData.customerPhone} 
                      className="w-full h-16 text-lg font-black rounded-2xl shadow-xl shadow-primary/20"
                    >
                      {isSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <CheckCircle2 className="mr-2 h-6 w-6" />}
                      Confirmar mi cita
                    </Button>
                    <Button variant="ghost" onClick={handleBack} className="w-full font-bold text-muted-foreground">
                       Modificar fecha u hora
                    </Button>
                  </div>
               </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
