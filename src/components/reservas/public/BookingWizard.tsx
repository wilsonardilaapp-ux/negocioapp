'use client';

import React, { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { ServiceStep } from "./ServiceStep";
import { StaffStep } from "./StaffStep";
import { TimeStep } from "./TimeStep";
import { ContactStep } from "./ContactStep";
import { SuccessView } from "./SuccessView";
import { Card } from "@/components/ui/card";
import { Check, User, Clock, Calendar, ArrowLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { confirmPublicBooking } from '@/actions/public-booking';
import { useToast } from '@/hooks/use-toast';
import type { Reservation, BookingService, BookingStaff } from '@/models/booking';

/**
 * @fileOverview Orquestador principal del flujo de reservas públicas (Wizard).
 * Gestiona el estado global del agendamiento y la navegación entre pasos.
 */

export function BookingWizard({ 
  businessId, 
  services, 
  staff, 
  initialServiceId 
}: { 
  businessId: string, 
  services: BookingService[], 
  staff: BookingStaff[], 
  initialServiceId?: string 
}) {
  const { toast } = useToast();
  const [step, setStep] = useState(initialServiceId ? 2 : 1);
  const [bookingData, setBookingData] = useState<Partial<Reservation>>({
    businessId,
    serviceId: initialServiceId || '',
    status: 'pending',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedReservation, setCreatedReservation] = useState<Reservation | null>(null);

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const handleConfirmBooking = async (contactData: any) => {
    setIsSubmitting(true);
    try {
      const finalData = { ...bookingData, ...contactData };
      const result = await confirmPublicBooking(businessId, finalData);
      
      if (result.success) {
        setCreatedReservation(result.reservation);
        handleNext();
      } else {
        toast({ 
          variant: 'destructive', 
          title: 'Error al agendar', 
          description: result.error 
        });
      }
    } catch (e) {
      toast({ 
        variant: 'destructive', 
        title: 'Error técnico', 
        description: 'No se pudo procesar la reserva en este momento.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedService = useMemo(() => 
    services.find(s => s.id === bookingData.serviceId), 
    [services, bookingData.serviceId]
  );
  
  const selectedStaff = useMemo(() => 
    staff.find(s => s.id === bookingData.staffId), 
    [staff, bookingData.staffId]
  );

  // Definición de pasos para el Stepper superior
  const wizardSteps = [
    { id: 1, label: 'SERVICIO', icon: Clock },
    { id: 2, label: 'PROFESIONAL', icon: User },
    { id: 3, label: 'HORARIO', icon: Calendar },
    { id: 4, label: 'CONTACTO', icon: Check },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Stepper Superior */}
      {step < 5 && (
        <div className="flex items-center justify-between px-4 sm:px-10">
          {wizardSteps.map((s, idx) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isCompleted = step > s.id;
            return (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-2">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    isActive ? "border-primary bg-primary text-white shadow-lg shadow-primary/20 scale-110" :
                    isCompleted ? "border-primary bg-primary/10 text-primary" : "border-muted text-muted-foreground bg-white"
                  )}>
                    {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className={cn(
                    "text-[10px] font-black tracking-widest transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}>
                    {s.label}
                  </span>
                </div>
                {idx < wizardSteps.length - 1 && (
                  <div className={cn(
                    "h-[2px] flex-1 mx-2 transition-colors duration-500", 
                    isCompleted ? "bg-primary" : "bg-muted"
                  )}></div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Vistas del Wizard */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {step === 1 && (
          <ServiceStep 
            services={services} 
            onSelect={(id) => { 
              setBookingData({ ...bookingData, serviceId: id }); 
              handleNext(); 
            }} 
          />
        )}

        {step === 2 && (
          <StaffStep 
            staffList={staff.filter(s => s.assignedServiceIds?.includes(bookingData.serviceId || ''))}
            onSelect={(id) => { 
              setBookingData({ ...bookingData, staffId: id }); 
              handleNext(); 
            }}
            onBack={handleBack}
          />
        )}

        {step === 3 && (
          <TimeStep 
            businessId={businessId}
            selectedService={selectedService}
            selectedStaff={selectedStaff}
            bookingData={bookingData}
            onSelect={(date, time) => { 
              setBookingData({ ...bookingData, date, startTime: time }); 
              handleNext(); 
            }}
            onBack={handleBack}
          />
        )}

        {step === 4 && (
          <ContactStep 
            bookingData={bookingData}
            onBack={handleBack}
            onSubmit={handleConfirmBooking}
            isSubmitting={isSubmitting}
            selectedService={selectedService}
            selectedStaff={selectedStaff}
          />
        )}

        {step === 5 && confirmedReservation && (
          <SuccessView 
            reservation={confirmedReservation} 
            businessId={businessId}
          />
        )}
      </div>
    </div>
  );
}

export default BookingWizard;
