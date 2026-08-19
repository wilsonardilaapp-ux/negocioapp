'use client';

import React, { useState, useEffect } from "react";
import { ServiceStep } from "./ServiceStep";
import { StaffStep } from "./StaffStep";
import { TimeStep } from "./TimeStep";
import { ContactStep } from "./ContactStep";
import { SuccessView } from "./SuccessView";
import { Check, User, Clock, Calendar, ArrowLeft, ChevronRight } from "lucide-react";
import type { BookingService, BookingStaff, Reservation } from "@/models/booking";
import { confirmPublicBooking } from "@/actions/public-booking";
import { useToast } from "@/hooks/use-toast";

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
  initialServiceId,
}: BookingWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdReservation, setCreatedReservation] = useState<Reservation | null>(null);
  
  const [bookingData, setBookingData] = useState<Partial<Reservation>>({
    businessId,
    serviceId: initialServiceId || "",
    status: 'pending',
  });

  // Efecto para manejar el deep linking del servicio
  useEffect(() => {
    if (initialServiceId && services.length > 0) {
      const service = services.find(s => s.id === initialServiceId);
      if (service) {
        setBookingData(prev => ({ 
          ...prev, 
          serviceId: service.id,
          durationMinutes: service.durationMinutes,
          price: service.price 
        }));
        setStep(2);
      }
    }
  }, [initialServiceId, services]);

  const handleServiceSelect = (service: BookingService) => {
    setBookingData(prev => ({ 
      ...prev, 
      serviceId: service.id,
      durationMinutes: service.durationMinutes,
      price: service.price 
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

  const handleConfirm = async (contactData: { customerName: string; customerPhone: string; customerEmail?: string; notes?: string }) => {
    setIsSubmitting(true);
    try {
      const finalData = { ...bookingData, ...contactData };
      const result = await confirmPublicBooking(businessId, finalData);
      
      if (result.success && result.reservation) {
        setCreatedReservation(result.reservation as Reservation);
        setStep(5);
      } else {
        toast({
          variant: "destructive",
          title: "Error al agendar",
          description: result.error || "No se pudo completar la reserva.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error técnico",
        description: "Ocurrió un error inesperado al procesar tu solicitud.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 5 && createdReservation) {
    return <SuccessView reservation={createdReservation} businessName={businessName} />;
  }

  const steps = [
    { id: 1, label: "Servicio", icon: Check },
    { id: 2, label: "Especialista", icon: User },
    { id: 3, label: "Horario", icon: Clock },
    { id: 4, label: "Confirmación", icon: Calendar },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Stepper Visual */}
      <div className="flex items-center justify-between px-4">
        {steps.map((s, idx) => (
          <React.Fragment key={s.id}>
            <div className="flex flex-col items-center gap-2">
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all",
                step >= s.id ? "bg-primary border-primary text-white" : "bg-white border-muted text-muted-foreground"
              )}>
                {step > s.id ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
              </div>
              <span className={cn("text-[10px] font-bold uppercase tracking-widest", step >= s.id ? "text-primary" : "text-muted-foreground")}>
                {s.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className={cn("h-0.5 flex-1 mx-2 mb-6", step > s.id ? "bg-primary" : "bg-muted")} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Vistas de los Pasos */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
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
            onConfirm={handleConfirm}
            onBack={() => setStep(3)}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}

export default BookingWizard;
