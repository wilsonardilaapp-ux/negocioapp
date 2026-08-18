
'use client';

import React, { useState } from 'react';
import { ServiceStep } from './ServiceStep';
import { StaffStep } from './StaffStep';
import { TimeStep } from './TimeStep';
import { ContactStep } from './ContactStep';
import { SuccessView } from './SuccessView';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2 } from 'lucide-react';
import type { BookingService, BookingStaff, Reservation } from '@/models/booking';
import { calculateEndTime } from '@/models/booking';
import { confirmPublicBooking } from '@/actions/public-booking';
import { useToast } from '@/hooks/use-toast';

interface Props {
  businessId: string;
  services: BookingService[];
  staff: BookingStaff[];
}

type Step = 'service' | 'staff' | 'time' | 'contact' | 'success';

export function BookingWizard({ businessId, services, staff }: Props) {
  const [currentStep, setCurrentStep] = useState<Step>('service');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Estado de la selección
  const [selection, setSelection] = useState<Partial<Reservation>>({
    serviceId: '',
    staffId: '',
    date: '',
    startTime: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    notes: ''
  });

  const steps: Step[] = ['service', 'staff', 'time', 'contact', 'success'];
  const progress = ((steps.indexOf(currentStep)) / (steps.length - 1)) * 100;

  const handleNext = (updates: Partial<Reservation>, nextStep: Step) => {
    setSelection(prev => ({ ...prev, ...updates }));
    setCurrentStep(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) setCurrentStep(steps[currentIndex - 1]);
  };

  const handleFinalConfirm = async (contactData: Pick<Reservation, 'customerName' | 'customerPhone' | 'customerEmail' | 'notes'>) => {
    setIsSubmitting(true);
    try {
      const service = services.find(s => s.id === selection.serviceId);
      if (!service) throw new Error('Servicio inválido');

      const bookingData = {
        ...selection,
        ...contactData,
        endTime: calculateEndTime(selection.startTime!, service.durationMinutes),
        price: service.price
      } as Omit<Reservation, 'id' | 'businessId' | 'status' | 'source' | 'createdAt' | 'updatedAt'>;

      const result = await confirmPublicBooking(businessId, bookingData);

      if (result.success) {
        setSelection(prev => ({ ...prev, ...contactData, id: result.reservationId }));
        setCurrentStep('success');
      } else {
        toast({ variant: 'destructive', title: 'Horario no disponible', description: result.error });
        if (result.error?.includes('horario')) setCurrentStep('time');
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo completar la reserva.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (currentStep === 'success') {
    return <SuccessView reservation={selection as Reservation} service={services.find(s => s.id === selection.serviceId)!} />;
  }

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          {currentStep !== 'service' ? (
            <Button variant="ghost" size="sm" onClick={handleBack} className="text-muted-foreground hover:text-primary">
              <ChevronLeft className="h-4 w-4 mr-1" /> Volver
            </Button>
          ) : <div />}
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Paso {steps.indexOf(currentStep) + 1} de 4
          </span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {currentStep === 'service' && (
        <ServiceStep 
          services={services} 
          onSelect={(id) => handleNext({ serviceId: id }, 'staff')} 
        />
      )}

      {currentStep === 'staff' && (
        <StaffStep 
          staff={staff.filter(s => s.assignedServiceIds.includes(selection.serviceId!))} 
          onSelect={(id) => handleNext({ staffId: id }, 'time')} 
        />
      )}

      {currentStep === 'time' && (
        <TimeStep 
          businessId={businessId}
          staffId={selection.staffId!}
          serviceDuration={services.find(s => s.id === selection.serviceId!)?.durationMinutes || 30}
          onSelect={(date, time) => handleNext({ date, startTime: time }, 'contact')} 
        />
      )}

      {currentStep === 'contact' && (
        <ContactStep 
          isSubmitting={isSubmitting}
          onConfirm={handleFinalConfirm} 
        />
      )}
    </div>
  );
}
