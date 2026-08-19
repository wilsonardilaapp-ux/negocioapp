'use client';

import React, { useState, useEffect } from "react";
import { ServiceStep } from "./ServiceStep";
import { StaffStep } from "./StaffStep";
import { TimeStep } from "./TimeStep";
import { ContactStep } from "./ContactStep";
import { SuccessView } from "./SuccessView";
import type { BookingService, BookingStaff, Reservation } from "@/models/booking";
import { confirmPublicBooking } from "@/actions/public-booking";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingWizardProps {
  businessId: string;
  businessName: string;
  services: BookingService[];
  staff: BookingStaff[];
  initialServiceId?: string | null;
}

export function BookingWizard({ businessId, businessName, services, staff, initialServiceId }: BookingWizardProps) {
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState<Partial<Reservation>>({
    businessId,
    serviceId: initialServiceId || undefined,
    status: 'pending',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdReservation, setCreatedReservation] = useState<Reservation | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (initialServiceId && services.length > 0) {
        const service = services.find(s => s.id === initialServiceId);
        if (service) {
            setBookingData(prev => ({ 
                ...prev, 
                serviceId: service.id,
                serviceName: service.name,
                price: service.price,
                durationMinutes: service.durationMinutes
            }));
            setStep(2);
        }
    }
  }, [initialServiceId, services]);

  const handleServiceSelect = (service: BookingService) => {
    setBookingData(prev => ({ 
        ...prev, 
        serviceId: service.id,
        serviceName: service.name,
        price: service.price,
        durationMinutes: service.durationMinutes
    }));
    setStep(2);
  };

  const handleStaffSelect = (staffId: string) => {
    const staffObj = staff.find(s => s.id === staffId);
    setBookingData(prev => ({ 
        ...prev, 
        staffId: staffId === 'any' ? null : staffId, 
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
      const finalData = { ...bookingData, ...contactData };
      const result = await confirmPublicBooking(businessId, finalData);
      if (result.success) {
        setCreatedReservation(result.reservation as Reservation);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo procesar la reserva.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (createdReservation) {
    return <SuccessView reservation={createdReservation} businessName={businessName} />;
  }

  const steps = [
    { id: 1, label: 'Servicio' },
    { id: 2, label: 'Profesional' },
    { id: 3, label: 'Horario' },
    { id: 4, label: 'Contacto' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8 px-4">
        {steps.map((s, idx) => (
          <React.Fragment key={s.id}>
            <div className="flex flex-col items-center gap-2">
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm transition-all",
                step >= s.id ? "bg-primary text-white shadow-lg scale-110" : "bg-muted text-muted-foreground"
              )}>
                {step > s.id ? '✓' : s.id}
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
            selectedStaffId={bookingData.staffId || undefined}
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
            selectedStaff={staff.find(s => s.id === (bookingData.staffId || 'any')) || null}
            onConfirm={handleConfirm}
            onBack={() => setStep(3)}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
