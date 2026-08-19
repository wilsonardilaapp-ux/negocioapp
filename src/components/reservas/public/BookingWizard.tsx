'use client';

import { useState, useEffect, useMemo } from "react";
import { ServiceStep } from "./ServiceStep";
import { StaffStep } from "./StaffStep";
import { TimeStep } from "./TimeStep";
import { ContactStep } from "./ContactStep";
import { SuccessView } from "./SuccessView";
import { Check, User, Clock, Calendar, ArrowLeft, ChevronRight, Scissors } from "lucide-react";
import { cn } from "@/lib/utils";
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

export function BookingWizard({ businessId, businessName, services, staff, initialServiceId }: BookingWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdReservation, setCreatedReservation] = useState<Reservation | null>(null);

  const [bookingData, setBookingData] = useState<Partial<Reservation>>({
    businessId,
    serviceId: initialServiceId || '',
    status: 'pending'
  });

  useEffect(() => {
    if (initialServiceId) {
      const s = services.find(serv => serv.id === initialServiceId);
      if (s) {
        setBookingData(prev => ({ ...prev, serviceId: initialServiceId, price: s.price, durationMinutes: s.durationMinutes }));
        setStep(2);
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
      const finalData = { ...bookingData, ...contactData };
      const result = await confirmPublicBooking(businessId, finalData);
      
      if (result.success && result.reservation) {
        setCreatedReservation(result.reservation as Reservation);
        setStep(5);
      } else {
        toast({ variant: 'destructive', title: 'Error al agendar', description: result.error });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error técnico', description: 'No se pudo procesar la reserva.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 5 && createdReservation) {
    return <SuccessView reservation={createdReservation} businessName={businessName} />;
  }

  const steps = [
    { id: 1, label: 'SERVICIO', icon: Scissors },
    { id: 2, label: 'PROFESIONAL', icon: User },
    { id: 3, label: 'HORARIO', icon: Clock },
    { id: 4, label: 'FINALIZAR', icon: Check },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Stepper Pro */}
      <div className="flex items-center justify-between px-4 sm:px-10">
        {steps.map((s, idx) => (
          <div key={s.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2 group">
              <div className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 shadow-sm",
                step >= s.id ? "bg-primary border-primary text-white scale-110 shadow-primary/20" : "bg-white border-muted text-muted-foreground"
              )}>
                <s.icon className="h-5 w-5" />
              </div>
              <span className={cn(
                "text-[10px] font-black tracking-widest hidden sm:block",
                step >= s.id ? "text-primary" : "text-muted-foreground"
              )}>
                {s.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className="h-[2px] flex-1 mx-4 bg-muted overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-700 ease-in-out" 
                  style={{ width: step > s.id ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Vistas de Pasos */}
      <div className="animate-in slide-in-from-bottom-4 duration-500">
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
