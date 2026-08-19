'use client';

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
  Check, 
  User, 
  Clock, 
  Calendar, 
  ArrowLeft, 
  Loader2,
  CalendarCheck
} from "lucide-react";

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

const STEPS = [
  { s: 1, label: "SERVICIO", icon: CalendarCheck },
  { s: 2, label: "PROFESIONAL", icon: User },
  { s: 3, label: "HORARIO", icon: Clock },
  { s: 4, label: "TUS DATOS", icon: Calendar },
];

export function BookingWizard({ businessId, services, staff, initialServiceId }: BookingWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdReservation, setCreatedReservation] = useState<Reservation | null>(null);

  const [bookingData, setBookingData] = useState({
    serviceId: initialServiceId || "",
    serviceName: "",
    staffId: null as string | null,
    staffName: "Cualquier Profesional",
    date: "",
    startTime: "",
    endTime: "",
    price: 0,
    durationMinutes: 30,
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    notes: ""
  });

  // Efecto para pre-seleccionar servicio si viene por URL
  useEffect(() => {
    if (initialServiceId && services.length > 0) {
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

  const handleStaffSelect = (staffId: string | 'any', staffObj?: BookingStaff) => {
    setBookingData(prev => ({
      ...prev,
      staffId: staffId === 'any' ? null : staffId,
      staffName: staffId === 'any' ? 'Cualquier Profesional' : (staffObj?.name || 'Profesional')
    }));
    setStep(3);
  };

  const handleDateTimeSelect = (data: { date: string, startTime: string, endTime: string }) => {
    setBookingData(prev => ({
      ...prev,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime
    }));
    setStep(4);
  };

  const handleConfirmBooking = async (contactInfo: { customerName: string, customerPhone: string, customerEmail?: string, notes?: string }) => {
    setIsSubmitting(true);
    
    // Unificar datos finales
    const finalData = {
      ...bookingData,
      ...contactInfo
    };

    try {
      const res = await confirmPublicBooking(businessId, finalData);
      
      if (res.success) {
        setCreatedReservation(res.reservation as Reservation);
        setStep(5); // Pantalla de éxito
      } else {
        toast({
          variant: "destructive",
          title: "Error al agendar",
          description: res.error || "Ocurrió un error técnico al procesar tu cita. Por favor intenta de nuevo.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error de conexión",
        description: err?.message || "No pudimos conectar con el servidor. Revisa tu conexión.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  // Si ya se creó la reserva, mostrar vista de éxito
  if (step === 5 && createdReservation) {
    return <SuccessView reservation={createdReservation} businessId={businessId} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* STEPPER SUPERIOR RESTAURADO */}
      <div className="flex items-center justify-between px-4 sm:px-10 relative">
        {/* Línea de fondo */}
        <div className="absolute top-5 left-10 right-10 h-0.5 bg-gray-200 -z-10 hidden sm:block" />
        
        {STEPS.map((item) => {
          const isCompleted = step > item.s;
          const isActive = step === item.s;
          
          return (
            <div key={item.s} className="flex flex-col items-center gap-2">
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-sm",
                isCompleted ? "bg-primary text-white" : 
                isActive ? "bg-primary text-white ring-4 ring-primary/20" : 
                "bg-white border-2 border-gray-200 text-gray-300"
              )}>
                {isCompleted ? <Check className="h-5 w-5" /> : <item.icon className="h-5 w-5" />}
              </div>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest",
                isActive || isCompleted ? "text-primary" : "text-gray-400"
              )}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* RENDERIZADO DINÁMICO DE PASOS */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        {step === 1 && (
          <ServiceStep 
            services={services} 
            onSelect={handleServiceSelect} 
            selectedId={bookingData.serviceId} 
          />
        )}
        
        {step === 2 && (
          <StaffStep 
            staffList={staff.filter(s => s.assignedServiceIds.includes(bookingData.serviceId))} 
            onSelectStaff={handleStaffSelect}
            selectedStaffId={bookingData.staffId || 'any'}
            onBack={handleBack}
          />
        )}

        {step === 3 && (
          <TimeStep 
            businessId={businessId}
            selectedService={services.find(s => s.id === bookingData.serviceId)}
            selectedStaff={staff.find(s => s.id === bookingData.staffId) || null}
            onBack={handleBack}
            onSelectDateTime={handleDateTimeSelect}
          />
        )}

        {step === 4 && (
          <ContactStep 
            bookingData={bookingData} // Pasa el objeto actual (asegurado por useState inicial)
            onBack={handleBack}
            onSubmit={handleConfirmBooking}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}
