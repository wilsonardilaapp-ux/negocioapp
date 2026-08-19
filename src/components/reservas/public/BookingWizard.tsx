'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ServiceStep } from './ServiceStep';
import { StaffStep } from './StaffStep';
import { TimeStep } from './TimeStep';
import { ContactStep } from './ContactStep';
import { SuccessView } from './SuccessView';
import { confirmPublicBooking } from '@/actions/public-booking';
import type { BookingService, BookingStaff, Reservation } from '@/models/booking';
import { Check, User, Clock, Calendar } from 'lucide-react';

interface BookingWizardProps {
  businessId: string;
  services: BookingService[];
  staff: BookingStaff[];
  initialServiceId?: string;
}

export function BookingWizard({ businessId, services, staff, initialServiceId }: BookingWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(initialServiceId ? 2 : 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdReservation, setCreatedReservation] = useState<Reservation | null>(null);

  const [bookingData, setBookingData] = useState<Partial<Reservation>>({
    serviceId: initialServiceId || '',
    businessId,
  });

  const STEPS = [
    { s: 1, label: "SERVICIO", icon: Check },
    { s: 2, label: "PROFESIONAL", icon: User },
    { s: 3, label: "HORARIO", icon: Clock },
    { s: 4, label: "TUS DATOS", icon: Calendar },
  ];

  const handleServiceSelect = (service: BookingService) => {
    setBookingData(prev => ({ ...prev, serviceId: service.id, price: service.price, durationMinutes: service.durationMinutes }));
    setStep(2);
  };

  const handleStaffSelect = (staffId: string, staffObj?: BookingStaff) => {
    setBookingData(prev => ({ ...prev, staffId: staffId === 'any' ? null : staffId, staffName: staffObj?.name || 'Cualquier Profesional' }));
    setStep(3);
  };

  const handleDateTimeSelect = (data: { date: string; startTime: string; endTime: string }) => {
    setBookingData(prev => ({ 
      ...prev, 
      date: data.date, 
      startTime: data.startTime, 
      endTime: data.endTime 
    }));
    setStep(4);
  };

  const handleConfirmBooking = async (contactInfo: any) => {
    setIsSubmitting(true);
    const finalData = { ...bookingData, ...contactInfo };

    try {
      const result = await confirmPublicBooking(businessId, finalData);
      if (result.success && result.reservation) {
        setCreatedReservation(result.reservation as Reservation);
        setStep(5);
      } else {
        toast({ variant: 'destructive', title: 'Error al agendar', description: result.error || 'No se pudo completar la reserva.' });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error técnico', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 5 && createdReservation) {
    return <SuccessView reservation={createdReservation} businessId={businessId} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Stepper */}
      <div className="flex justify-between items-center px-4 sm:px-10 relative">
        <div className="absolute top-5 left-10 right-10 h-0.5 bg-gray-200 -z-10 hidden sm:block"></div>
        {STEPS.map((item) => {
          const Icon = item.icon;
          const isActive = step === item.s;
          const isCompleted = step > item.s;

          return (
            <div key={item.s} className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                isCompleted ? 'bg-primary text-white' : isActive ? 'bg-primary text-white ring-4 ring-primary/20' : 'bg-white border-2 text-gray-300'
              }`}>
                {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span className={`text-[10px] font-bold tracking-widest uppercase ${isActive ? 'text-primary' : 'text-gray-400'}`}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Steps Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {step === 1 && (
          <ServiceStep 
            services={services} 
            selectedId={bookingData.serviceId} 
            onSelect={handleServiceSelect} 
          />
        )}
        {step === 2 && (
          <StaffStep 
            staffList={staff} 
            selectedStaffId={bookingData.staffId || 'any'} 
            onSelectStaff={handleStaffSelect}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <TimeStep 
            businessId={businessId}
            selectedService={services.find(s => s.id === bookingData.serviceId)}
            selectedStaff={staff.find(s => s.id === bookingData.staffId)}
            onSelectDateTime={handleDateTimeSelect}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <ContactStep 
            bookingData={bookingData}
            onBack={() => setStep(3)}
            onSubmit={handleConfirmBooking}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
}

export default BookingWizard;
