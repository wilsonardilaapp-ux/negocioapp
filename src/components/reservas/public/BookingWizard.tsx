'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ServiceStep } from "./ServiceStep";
import { StaffStep } from "./StaffStep";
import { TimeStep } from "./TimeStep";
import { ContactStep } from "./ContactStep";
import { SuccessView } from "./SuccessView";
import { Check, User, Clock, Calendar, ArrowLeft, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BookingService, BookingStaff, Reservation } from "@/models/booking";
import { confirmPublicBooking } from "@/actions/public-booking";
import { useToast } from "@/hooks/use-toast";

/**
 * @fileOverview Orquestador principal del asistente de reservas públicas.
 * Gestiona el estado global del flujo, el stepper y la navegación entre pasos.
 */

interface BookingWizardProps {
  businessId: string;
  businessName: string;
  services: BookingService[];
  staff: BookingStaff[];
  initialServiceId?: string;
}

export function BookingWizard({ 
  businessId, 
  businessName,
  services, 
  staff, 
  initialServiceId 
}: BookingWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdReservation, setCreatedReservation] = useState<Reservation | null>(null);

  // Estado centralizado de la reserva
  const [bookingData, setBookingData] = useState<Partial<Reservation>>({
    serviceId: initialServiceId || '',
    businessId: businessId,
    status: 'pending' as const
  });

  // Efecto para pre-seleccionar servicio si viene por URL
  useEffect(() => {
    if (initialServiceId) {
      const service = services.find(s => s.id === initialServiceId);
      if (service) {
        handleServiceSelect(service);
      }
    }
  }, [initialServiceId, services]);

  const handleServiceSelect = (service: BookingService) => {
    setBookingData(prev => ({ 
        ...prev, 
        serviceId: service.id, 
        price: service.price,
        durationMinutes: service.durationMinutes 
    }));
    setStep(2);
  };

  const handleStaffSelect = (staffId: string) => {
    const staffObj = staff.find(s => s.id === staffId);
    setBookingData(prev => ({ 
        ...prev, 
        staffId: staffId === 'any' ? undefined : staffId, 
        staffName: staffObj?.name || 'Cualquier Profesional' 
    }));
    setStep(3);
  };

  const handleTimeSelect = (date: string, startTime: string) => {
    setBookingData(prev => ({ ...prev, date, startTime }));
    setStep(4);
  };

  const handleConfirm = async (contactData: any) => {
    setIsSubmitting(true);
    try {
      const finalPayload = { ...bookingData, ...contactData };
      const result = await confirmPublicBooking(businessId, finalPayload);
      
      if (result.success && result.reservation) {
        setCreatedReservation(result.reservation as Reservation);
        setStep(5);
      } else {
        toast({ variant: 'destructive', title: 'Error al agendar', description: result.error });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error crítico', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Renderizado de la Pantalla de Éxito
  if (step === 5 && createdReservation) {
    return <SuccessView reservation={createdReservation} businessName={businessName} />;
  }

  const steps = [
    { id: 1, label: 'SERVICIO', icon: Sparkles },
    { id: 2, label: 'PROFESIONAL', icon: User },
    { id: 3, label: 'HORARIO', icon: Clock },
    { id: 4, label: 'CONFIRMACIÓN', icon: Check },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Stepper Superior */}
      <div className="flex items-center justify-center gap-2 px-2 overflow-x-auto no-scrollbar">
        {steps.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className={cn(
              "flex flex-col items-center gap-2 transition-all duration-300 min-w-[80px]",
              step >= s.id ? "text-primary opacity-100" : "text-muted-foreground opacity-40"
            )}>
              <div className={cn(
                "h-10 w-10 rounded-2xl flex items-center justify-center border-2 transition-all",
                step > s.id ? "bg-primary border-primary text-white" : 
                step === s.id ? "border-primary bg-white text-primary shadow-lg shadow-primary/10" : 
                "border-muted bg-white"
              )}>
                {step > s.id ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                "h-0.5 w-8 mb-6 rounded-full transition-all",
                step > s.id ? "bg-primary" : "bg-muted"
              )} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Contenido Dinámico del Wizard */}
      <div className="animate-in slide-in-from-bottom-2 duration-500">
        {step === 1 && (
          <ServiceStep 
            services={services} 
            onSelect={handleServiceSelect} 
          />
        )}
        
        {step === 2 && (
          <StaffStep 
            staffList={staff.filter(s => s.assignedServiceIds?.includes(bookingData.serviceId || ''))}
            selectedStaffId={bookingData.staffId}
            onSelectStaff={handleStaffSelect}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <TimeStep 
            businessId={businessId}
            selectedStaffId={bookingData.staffId || 'any'}
            serviceDuration={bookingData.durationMinutes || 30}
            onSelect={handleTimeSelect}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && (
          <ContactStep 
            bookingData={bookingData}
            selectedService={services.find(s => s.id === bookingData.serviceId) || null}
            selectedStaff={staff.find(s => s.id === bookingData.staffId) || null}
            onNext={handleConfirm}
            onBack={() => setStep(3)}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}

export default BookingWizard;
