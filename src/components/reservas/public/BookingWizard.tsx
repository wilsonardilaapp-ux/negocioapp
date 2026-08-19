'use client';

import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Check, 
  User, 
  Clock, 
  Calendar, 
  ArrowLeft, 
  Loader2,
  CalendarCheck
} from "lucide-react";

import { ServiceStep } from './ServiceStep';
import { StaffStep } from './StaffStep';
import { TimeStep } from './TimeStep';
import { ContactStep } from './ContactStep';
import { SuccessView } from './SuccessView';

import type { BookingService, BookingStaff, Reservation } from '@/models/booking';
import { confirmPublicBooking } from '@/actions/public-booking';

interface BookingWizardProps {
  businessId: string;
  services: BookingService[];
  staff: BookingStaff[];
  initialServiceId?: string;
}

const STEPS = [
  { s: 1, label: "SERVICIO", icon: Check },
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
    serviceId: initialServiceId || '',
    serviceName: '',
    durationMinutes: 30,
    price: 0,
    staffId: 'any',
    staffName: 'Cualquier Profesional',
    date: '',
    startTime: '',
    endTime: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    notes: ''
  });

  // Efecto para auto-seleccionar servicio si viene por URL
  useEffect(() => {
    if (initialServiceId && services.length > 0) {
      const s = services.find(item => item.id === initialServiceId);
      if (s) {
        setBookingData(prev => ({
          ...prev,
          serviceId: s.id,
          serviceName: s.name,
          durationMinutes: s.durationMinutes,
          price: s.price
        }));
        setStep(2);
      }
    }
  }, [initialServiceId, services]);

  const handleBack = () => setStep(prev => Math.max(1, prev - 1));

  const handleConfirmBooking = async (formData: any) => {
    setIsSubmitting(true);
    const finalData = { ...bookingData, ...formData };
    
    try {
      const res = await confirmPublicBooking(businessId, finalData);
      
      if (!res.success) {
        toast({
          variant: "destructive",
          title: "Error al agendar",
          description: res.error || "No se pudo completar la reserva.",
        });
        setIsSubmitting(false);
        return;
      }

      setCreatedReservation(res.reservation as Reservation);
      setStep(5);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error de conexión",
        description: err?.message || "Ocurrió un error inesperado.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <ServiceStep 
            services={services} 
            selectedId={bookingData.serviceId}
            onSelect={(s) => {
              setBookingData(prev => ({ ...prev, serviceId: s.id, serviceName: s.name, durationMinutes: s.durationMinutes, price: s.price }));
              setStep(2);
            }} 
          />
        );
      case 2:
        return (
          <StaffStep 
            staffList={staff.filter(s => s.assignedServiceIds.includes(bookingData.serviceId))}
            selectedStaffId={bookingData.staffId}
            onBack={handleBack}
            onSelectStaff={(id, s) => {
              setBookingData(prev => ({ ...prev, staffId: id, staffName: s?.name || 'Cualquier Profesional' }));
              setStep(3);
            }}
          />
        );
      case 3:
        return (
          <TimeStep 
            businessId={businessId}
            selectedService={services.find(s => s.id === bookingData.serviceId)}
            selectedStaff={staff.find(s => s.id === bookingData.staffId)}
            onBack={handleBack}
            onSelectDateTime={(data) => {
              setBookingData(prev => ({ ...prev, ...data }));
              setStep(4);
            }}
          />
        );
      case 4:
        return (
          <ContactStep 
            bookingData={bookingData}
            isSubmitting={isSubmitting}
            onBack={handleBack}
            onSubmit={handleConfirmBooking}
          />
        );
      case 5:
        return <SuccessView reservation={createdReservation!} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {step < 5 && (
        <div className="flex items-center justify-center mb-12 relative px-4">
          <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-gray-200 -z-10 -translate-y-4"></div>
          <div className="flex justify-between w-full max-w-2xl">
            {STEPS.map((item) => {
              const isActive = step === item.s;
              const isCompleted = step > item.s;
              const Icon = item.icon;

              return (
                <div key={item.s} className="flex flex-col items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-4",
                    isCompleted ? "bg-primary border-primary text-white" :
                    isActive ? "bg-white border-primary text-primary shadow-lg shadow-primary/20 scale-110" :
                    "bg-white border-gray-200 text-gray-300"
                  )}>
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
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
        </div>
      )}

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {renderStep()}
      </div>
    </div>
  );
}
