'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ServiceStep } from './steps/ServiceStep';
import { StaffStep } from './steps/StaffStep';
import { TimeStep } from './steps/TimeStep';
import { SummaryStep } from './steps/SummaryStep';
import { CheckoutStep } from './steps/CheckoutStep';
import { SuccessStep } from './steps/SuccessStep';
import { BookingProgress } from './BookingProgress';
import type { BookingService, BookingStaff, Reservation } from '@/models/booking';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

/**
 * @fileOverview Orquestador del flujo de reserva público.
 * Actualizado para soportar Deep Linking por servicio (Fase 13).
 */

type Step = 'service' | 'staff' | 'time' | 'summary' | 'checkout' | 'success';

interface Props {
  businessId: string;
  services: BookingService[];
  staff: BookingStaff[];
}

export function BookingWizard({ businessId, services, staff }: Props) {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('service');
  const [bookingData, setBookingData] = useState<Partial<Reservation>>({
    businessId,
    serviceId: '',
    staffId: '',
    date: '',
    startTime: '',
    customerName: '',
    customerPhone: '',
  });

  // --- LÓGICA DE DEEP LINKING (FASE 13) ---
  useEffect(() => {
    const serviceIdFromUrl = searchParams.get('service');
    if (serviceIdFromUrl) {
      const exists = services.find(s => s.id === serviceIdFromUrl);
      if (exists) {
        setBookingData(prev => ({ ...prev, serviceId: serviceIdFromUrl }));
        setStep('staff'); // Saltar directamente al paso 2
      }
    }
  }, [searchParams, services]);

  const updateData = (updates: Partial<Reservation>) => {
    setBookingData(prev => ({ ...prev, ...updates }));
  };

  const steps: { id: Step; label: string }[] = [
    { id: 'service', label: 'Servicio' },
    { id: 'staff', label: 'Profesional' },
    { id: 'time', label: 'Horario' },
    { id: 'summary', label: 'Resumen' },
    { id: 'checkout', label: 'Datos' },
    { id: 'success', label: 'Listo' }
  ];

  const canGoBack = step !== 'service' && step !== 'success';
  const handleBack = () => {
    const currentIndex = steps.findIndex(s => s.id === step);
    if (currentIndex > 0) setStep(steps[currentIndex - 1].id);
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        {canGoBack ? (
          <Button variant="ghost" onClick={handleBack} className="text-gray-500 font-bold gap-2 pl-0">
            <ChevronLeft className="h-4 w-4" /> Volver
          </Button>
        ) : <div />}
        <BookingProgress currentStep={step} steps={steps} />
      </div>

      <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white">
        <CardContent className="p-0">
          {step === 'service' && (
            <ServiceStep 
              services={services} 
              onSelect={(id) => { updateData({ serviceId: id }); setStep('staff'); }} 
            />
          )}
          {step === 'staff' && (
            <StaffStep 
              staff={staff} 
              serviceId={bookingData.serviceId!} 
              onSelect={(id) => { updateData({ staffId: id }); setStep('time'); }} 
            />
          )}
          {step === 'time' && (
            <TimeStep 
              businessId={businessId}
              serviceId={bookingData.serviceId!}
              staffId={bookingData.staffId!}
              onSelect={(date, start, end) => { updateData({ date, startTime: start, endTime: end }); setStep('summary'); }} 
            />
          )}
          {step === 'summary' && (
            <SummaryStep 
              data={bookingData} 
              services={services} 
              staff={staff} 
              onConfirm={() => setStep('checkout')} 
            />
          )}
          {step === 'checkout' && (
            <CheckoutStep 
              data={bookingData} 
              onConfirm={(customer) => { updateData(customer); setStep('success'); }} 
            />
          )}
          {step === 'success' && (
            <SuccessStep 
              data={bookingData} 
              services={services}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
