'use client';

import React, { useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, getDoc } from 'firebase/firestore';
import { ServiceStep } from './ServiceStep';
import { StaffStep } from './StaffStep';
import { TimeStep } from './TimeStep';
import { ContactStep } from './ContactStep';
import { SuccessView } from './SuccessView';
import { useToast } from '@/hooks/use-toast';
import { confirmPublicBooking } from '@/actions/public-booking';
import type { BookingService, BookingStaff, BookingAvailability, Reservation } from '@/models/booking';
import { Loader2, Check, User, Clock, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookingWizardProps {
  businessId: string;
  services: BookingService[];
  staff: BookingStaff[];
  initialServiceId?: string;
}

export function BookingWizard({ businessId, services, staff, initialServiceId }: BookingWizardProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedReservation, setConfirmedReservation] = useState<Reservation | null>(null);

  const [bookingData, setBookingData] = useState({
    serviceId: initialServiceId || '',
    serviceName: services.find(s => s.id === initialServiceId)?.name || '',
    price: services.find(s => s.id === initialServiceId)?.price || 0,
    durationMinutes: services.find(s => s.id === initialServiceId)?.durationMinutes || 30,
    staffId: 'any',
    staffName: 'Cualquier Profesional',
    date: '',
    startTime: '',
    endTime: '',
  });

  // --- DATA FETCHING COMPLEMENTARIA ---
  const availQuery = useMemoFirebase(() => collection(firestore, `businesses/${businessId}/bookingAvailability`), [businessId, firestore]);
  const resQuery = useMemoFirebase(() => collection(firestore, `businesses/${businessId}/reservations`), [businessId, firestore]);

  const { data: availabilityList, isLoading: loadingAvail } = useCollection<BookingAvailability>(availQuery);
  const { data: allReservations, isLoading: loadingRes } = useCollection<Reservation>(resQuery);

  const handleSelectService = (service: BookingService) => {
    setBookingData(prev => ({ 
      ...prev, 
      serviceId: service.id, 
      serviceName: service.name,
      price: service.price,
      durationMinutes: service.durationMinutes
    }));
    setStep(2);
  };

  const handleSelectStaff = (staffId: string, staffMember?: BookingStaff) => {
    setBookingData(prev => ({ 
      ...prev, 
      staffId, 
      staffName: staffMember ? staffMember.name : 'Cualquier Profesional' 
    }));
    setStep(3);
  };

  const handleSelectDateTime = (data: { date: string; startTime: string; endTime: string }) => {
    setBookingData(prev => ({ ...prev, ...data }));
    setStep(4);
  };

  const handleConfirmBooking = async (contactData: any) => {
    setIsSubmitting(true);
    try {
        const payload = { ...bookingData, ...contactData };
        const result = await confirmPublicBooking(businessId, payload);
        
        if (result.success && result.reservation) {
            setConfirmedReservation(result.reservation as Reservation);
            setStep(5);
        } else {
            toast({ variant: 'destructive', title: 'Error al agendar', description: result.error });
        }
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error técnico', description: 'No se pudo procesar la reserva.' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleBack = () => setStep(prev => prev - 1);

  if (loadingAvail || loadingRes) {
    return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground animate-pulse">Cargando disponibilidad...</p>
        </div>
    );
  }

  if (step === 5 && confirmedReservation) {
    return <SuccessView reservation={confirmedReservation} onClose={() => window.location.reload()} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      {/* Indicador de Pasos (Stepper) */}
      <div className="relative flex justify-between items-center max-w-lg mx-auto px-4">
        <div className="absolute left-0 top-5 w-full h-[2px] bg-muted -z-10" />
        {[
          { s: 1, label: "SERVICIO", icon: Check },
          { s: 2, label: "PROFESIONAL", icon: User },
          { s: 3, label: "HORARIO", icon: Clock },
          { s: 4, label: "TUS DATOS", icon: Calendar },
        ].map((item) => {
          const isActive = step === item.s;
          const isDone = step > item.s;
          return (
            <div key={item.s} className="flex flex-col items-center gap-2">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2",
                isDone ? "bg-primary border-primary text-white" :
                isActive ? "bg-white border-primary text-primary shadow-lg shadow-primary/20 scale-110" :
                "bg-white border-muted text-muted-foreground"
              )}>
                {isDone ? <Check className="h-5 w-5" /> : <item.icon className="h-5 w-5" />}
              </div>
              <span className={cn(
                "text-[9px] font-black tracking-widest transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* Renderizado de Pasos */}
      {step === 1 && <ServiceStep services={services} onSelectService={handleSelectService} />}
      
      {step === 2 && (
        <StaffStep 
          staffList={staff.filter(s => s.assignedServiceIds.includes(bookingData.serviceId))} 
          onSelectStaff={handleSelectStaff}
          onBack={handleBack}
        />
      )}

      {step === 3 && (
        <TimeStep 
          selectedService={services.find(s => s.id === bookingData.serviceId)!}
          selectedStaff={staff.find(s => s.id === bookingData.staffId) || null}
          availabilityList={availabilityList || []}
          existingReservations={allReservations || []}
          onSelectDateTime={handleSelectDateTime}
          onBack={handleBack}
        />
      )}

      {step === 4 && (
        <ContactStep 
          bookingData={bookingData}
          onBack={handleBack}
          onSubmit={handleConfirmBooking}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}

export default BookingWizard;
