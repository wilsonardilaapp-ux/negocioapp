'use client';

import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
  Check, 
  User, 
  Clock, 
  Calendar, 
  ArrowLeft, 
  ChevronRight,
  Loader2,
  Sparkles,
  MapPin,
  Smartphone,
  CheckCircle2,
  CalendarDays
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServiceStep } from "./ServiceStep";
import { StaffStep } from "./StaffStep";
import { TimeStep } from "./TimeStep";
import { ContactStep } from "./ContactStep";
import { SuccessView } from "./SuccessView";
import { confirmPublicBooking } from "@/actions/public-booking";
import type { BookingService, BookingStaff, Reservation } from "@/models/booking";

interface BookingWizardProps {
  businessId: string;
  services: BookingService[];
  staff: BookingStaff[];
  initialServiceId?: string;
}

export function BookingWizard({ businessId, services, staff, initialServiceId }: BookingWizardProps) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdReservation, setCreatedReservation] = useState<Reservation | null>(null);

  const [bookingData, setBookingData] = useState({
    serviceId: initialServiceId || '',
    serviceName: '',
    durationMinutes: 30,
    price: 0,
    staffId: '',
    staffName: '',
    date: '',
    startTime: '',
    endTime: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    notes: '',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const STEPS = [
    { s: 1, label: "SERVICIO", icon: CheckCircle2 },
    { s: 2, label: "PROFESIONAL", icon: User },
    { s: 3, label: "HORARIO", icon: Clock },
    { s: 4, label: "TUS DATOS", icon: CalendarDays },
  ];

  const handleSelectService = (service: BookingService) => {
    setBookingData(prev => ({
      ...prev,
      serviceId: service.id,
      serviceName: service.name,
      durationMinutes: service.durationMinutes,
      price: service.price
    }));
    setStep(2);
  };

  const handleSelectStaff = (staffId: string, staffMember?: BookingStaff) => {
    setBookingData(prev => ({
      ...prev,
      staffId: staffId,
      staffName: staffMember ? staffMember.name : 'Cualquier Profesional'
    }));
    setStep(3);
  };

  const handleSelectDateTime = (data: { date: string; startTime: string; endTime: string }) => {
    setBookingData(prev => ({
      ...prev,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime
    }));
    setStep(4);
  };

  const handleConfirm = async (contactData: any) => {
    setIsSubmitting(true);
    const finalData = { ...bookingData, ...contactData };

    try {
      const res = await confirmPublicBooking(businessId, finalData);
      if (res.success) {
        setCreatedReservation(res.reservation);
        setStep(5);
      } else {
        toast({
          variant: "destructive",
          title: "Error al agendar",
          description: res.error || "No se pudo procesar tu cita. Por favor intenta de nuevo.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error técnico",
        description: err.message || "Ocurrió un error inesperado.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  // Pantalla de Éxito (Fuera del layout estándar del wizard)
  if (step === 5 && createdReservation) {
    return <SuccessView reservation={createdReservation} businessId={businessId} />;
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-10 py-4 px-2">
      {/* STEPPER SUPERIOR RESTAURADO */}
      <div className="flex justify-between items-center relative max-w-2xl mx-auto px-4">
        {/* Línea de fondo */}
        <div className="absolute top-5 left-8 right-8 h-0.5 bg-gray-200 -z-0" />
        
        {STEPS.map((item) => {
          const isActive = step === item.s;
          const isCompleted = step > item.s;
          const Icon = isCompleted ? Check : item.icon;

          return (
            <div key={item.s} className="flex flex-col items-center gap-3 relative z-10">
              <div 
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2 shadow-sm",
                  isCompleted ? "bg-primary border-primary text-white" :
                  isActive ? "bg-primary border-primary text-white scale-110 shadow-lg" :
                  "bg-white border-gray-200 text-gray-300"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "animate-in zoom-in duration-300")} />
              </div>
              <span className={cn(
                "text-[10px] font-black tracking-widest uppercase",
                isActive || isCompleted ? "text-primary" : "text-gray-400"
              )}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* CONTENIDO DE LOS PASOS */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        {step === 1 && (
          <ServiceStep 
            services={services} 
            onSelect={handleSelectService} 
            selectedServiceId={bookingData.serviceId} 
          />
        )}

        {step === 2 && (
          <StaffStep 
            staffList={staff.filter(s => s.assignedServiceIds.includes(bookingData.serviceId))} 
            onSelectStaff={handleSelectStaff}
            onBack={() => setStep(1)}
            selectedStaffId={bookingData.staffId}
          />
        )}

        {step === 3 && (
          <TimeStep 
            businessId={businessId}
            selectedService={services.find(s => s.id === bookingData.serviceId)}
            selectedStaffId={bookingData.staffId}
            onSelectDateTime={handleSelectDateTime}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && (
          <ContactStep 
            bookingData={bookingData}
            onConfirm={handleConfirm}
            onBack={() => setStep(3)}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
