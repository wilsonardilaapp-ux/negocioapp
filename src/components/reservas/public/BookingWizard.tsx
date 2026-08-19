'use client';

import { useState, useEffect } from "react";
import { ServiceStep } from "./ServiceStep";
import { StaffStep } from "./StaffStep";
import { TimeStep } from "./TimeStep";
import { ContactStep } from "./ContactStep";
import { SuccessView } from "./SuccessView";
import { Check, User, Clock, Calendar, ArrowLeft, ChevronRight } from "lucide-react";
import type { BookingService, BookingStaff, Reservation } from "@/models/booking";
import { confirmPublicBooking } from "@/actions/public-booking";
import { cn } from "@/lib/utils";

interface BookingWizardProps {
  businessId: string;
  businessName: string;
  services: BookingService[];
  staff: BookingStaff[];
  initialServiceId?: string;
}

export function BookingWizard({ businessId, businessName, services, staff, initialServiceId }: BookingWizardProps) {
  const [step, setStep] = useState(1);
  const [bookingData, setBookingData] = useState<Partial<Reservation>>({
    businessId,
    serviceId: initialServiceId || '',
    status: 'pending'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdReservation, setCreatedReservation] = useState<Reservation | null>(null);

  useEffect(() => {
    if (initialServiceId) {
      const service = services.find(s => s.id === initialServiceId);
      if (service) {
        setBookingData(prev => ({ ...prev, serviceId: initialServiceId, price: service.price }));
        setStep(2);
      }
    }
  }, [initialServiceId, services]);

  const handleServiceSelect = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    setBookingData(prev => ({ ...prev, serviceId, price: service?.price || 0 }));
    setStep(2);
  };

  const handleStaffSelect = (staffId: string) => {
    const staffObj = staff.find(s => s.id === staffId);
    setBookingData(prev => ({ ...prev, staffId: staffId === 'any' ? undefined : staffId, staffName: staffObj?.name || 'Cualquier Profesional' }));
    setStep(3);
  };

  const handleDateTimeSelect = (date: string, startTime: string) => {
    setBookingData(prev => ({ ...prev, date, startTime }));
    setStep(4);
  };

  const handleConfirmBooking = async (contactData: { customerName: string; customerPhone: string; customerEmail?: string; notes?: string }) => {
    setIsSubmitting(true);
    const finalData = { ...bookingData, ...contactData };
    try {
      const result = await confirmPublicBooking(businessId, finalData);
      if (result.success) {
        setCreatedReservation(result.reservation as Reservation);
        setStep(5);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error("Error confirming booking:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  if (step === 5 && createdReservation) {
    return <SuccessView reservation={createdReservation} businessName={businessName} />;
  }

  const steps = [
    { id: 1, label: 'SERVICIO', icon: Check },
    { id: 2, label: 'PROFESIONAL', icon: User },
    { id: 3, label: 'HORARIO', icon: Clock },
    { id: 4, label: 'CONTACTO', icon: Calendar },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Stepper */}
      <div className="flex items-center justify-between px-4 sm:px-0">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors",
                step >= s.id ? "border-primary bg-primary text-white" : "border-muted text-muted-foreground bg-white"
              )}>
                <s.icon className="h-5 w-5" />
              </div>
              <span className={cn(
                "text-[10px] font-black tracking-widest",
                step >= s.id ? "text-primary" : "text-muted-foreground"
              )}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                "h-[2px] flex-1 mx-4 -mt-6",
                step > s.id ? "bg-primary" : "bg-muted"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="mt-8 animate-in fade-in duration-500">
        {step === 1 && (
          <ServiceStep 
            services={services} 
            selectedServiceId={bookingData.serviceId} 
            onSelect={handleServiceSelect} 
          />
        )}
        {step === 2 && (
          <StaffStep 
            staffList={staff.filter(s => s.assignedServiceIds?.includes(bookingData.serviceId || ''))}
            selectedStaffId={bookingData.staffId} 
            onSelect={handleStaffSelect}
            onBack={handleBack}
          />
        )}
        {step === 3 && (
          <TimeStep 
            businessId={businessId}
            staffId={bookingData.staffId || 'any'}
            serviceDuration={services.find(s => s.id === bookingData.serviceId)?.durationMinutes || 30}
            onSelect={handleDateTimeSelect}
            onBack={handleBack}
          />
        )}
        {step === 4 && (
          <ContactStep 
            bookingData={bookingData}
            selectedService={services.find(s => s.id === bookingData.serviceId) || null}
            selectedStaff={staff.find(s => s.id === bookingData.staffId) || null}
            onBack={handleBack}
            onSubmit={handleConfirmBooking}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}

export default BookingWizard;
