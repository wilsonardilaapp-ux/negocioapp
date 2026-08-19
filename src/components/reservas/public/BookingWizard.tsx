
'use client';

import React, { useState, useEffect, useMemo } from "react";
import { ServiceStep } from "./ServiceStep";
import { StaffStep } from "./StaffStep";
import { TimeStep } from "./TimeStep";
import { ContactStep } from "./ContactStep";
import { SuccessView } from "./SuccessView";
import { 
  Check, 
  User, 
  Clock, 
  Calendar, 
  ArrowLeft, 
  ChevronRight,
  Loader2,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Reservation, BookingService, BookingStaff } from "@/models/booking";
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
    serviceId: initialServiceId || '',
    status: 'pending',
    durationMinutes: services.find(s => s.id === initialServiceId)?.durationMinutes || 30
  });

  // Si hay un servicio inicial, saltamos al paso 2
  useEffect(() => {
    if (initialServiceId && step === 1) {
      setStep(2);
    }
  }, [initialServiceId]);

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

  const handleConfirm = async (contactData: any) => {
    setIsSubmitting(true);
    try {
      const finalData = { ...bookingData, ...contactData };
      const result = await confirmPublicBooking(businessId, finalData);
      
      if (result.success && result.reservation) {
        setCreatedReservation(result.reservation as Reservation);
        setStep(5);
      } else {
        toast({ variant: "destructive", title: "Error al agendar", description: result.error });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fallo técnico", description: "Ocurrió un error inesperado al procesar tu cita." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 5 && createdReservation) {
    return <SuccessView reservation={createdReservation} businessName={businessName} />;
  }

  const steps = [
    { id: 1, label: 'SERVICIO', icon: <Clock className="w-4 h-4" /> },
    { id: 2, label: 'PROFESIONAL', icon: <User className="w-4 h-4" /> },
    { id: 3, label: 'HORARIO', icon: <Calendar className="w-4 h-4" /> },
    { id: 4, label: 'FINALIZAR', icon: <Check className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-10">
      {/* Stepper Superior */}
      <div className="relative flex justify-between items-center px-4 md:px-10 overflow-hidden">
        {/* Línea de fondo */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 z-0" />
        
        {steps.map((s, idx) => {
          const isActive = step === s.id;
          const isCompleted = step > s.id;
          
          return (
            <div key={s.id} className="relative z-10 flex flex-col items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-4",
                isActive ? "bg-primary border-white text-white shadow-xl shadow-primary/20 scale-110" : 
                isCompleted ? "bg-white border-primary text-primary" : "bg-white border-gray-100 text-gray-300"
              )}>
                {isCompleted ? <Check className="w-6 h-6 stroke-[3px]" /> : s.icon}
              </div>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
                isActive ? "text-primary" : "text-gray-400"
              )}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Contenido Dinámico del Wizard */}
      <div className="min-h-[500px]">
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
            selectedStaff={bookingData.staffId || 'any'}
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

      {/* Footer de confianza */}
      <div className="flex justify-center items-center gap-8 py-6 border-t border-dashed opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4 text-primary" /> Reserva Segura SSL
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
            <Sparkles className="w-4 h-4 text-primary" /> Potenciado por Markix
          </div>
      </div>
    </div>
  );
}

export default BookingWizard;
