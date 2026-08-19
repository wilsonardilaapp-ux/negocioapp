'use client';

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, Calendar, Clock, User, ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";

import { ServiceStep } from "./ServiceStep";
import { StaffStep } from "./StaffStep";
import { TimeStep } from "./TimeStep";
import { ContactStep } from "./ContactStep";
import { SuccessView } from "./SuccessView";

import type { BookingService, BookingStaff, Reservation } from "@/models/booking";
import { confirmPublicBooking } from "@/actions/public-booking";

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
    price: 0,
    durationMinutes: 30,
    staffId: '',
    staffName: '',
    date: '',
    startTime: '',
    endTime: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    notes: ''
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateBookingData = (updates: Partial<typeof bookingData>) => {
    setBookingData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const res = await confirmPublicBooking(businessId, bookingData);
      if (res.success) {
        setCreatedReservation(res.reservation as Reservation);
        setStep(5); // Success Step
      } else {
        toast({
          variant: "destructive",
          title: "Error al agendar",
          description: res.error || "No se pudo completar la reserva.",
        });
      }
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

  const formatReservationDate = (dateVal: string | null) => {
    try {
      if (!dateVal) return "";
      const d = new Date(dateVal.includes('T') ? dateVal : `${dateVal}T00:00:00`);
      if (isNaN(d.getTime())) return String(dateVal);
      return format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
    } catch {
      return String(dateVal || "");
    }
  };

  if (!mounted) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  if (step === 5 && createdReservation) {
    return <SuccessView reservation={createdReservation} formatAction={formatReservationDate} />;
  }

  const steps = [
    { id: 1, label: 'Servicio', icon: Sparkles },
    { id: 2, label: 'Profesional', icon: User },
    { id: 3, label: 'Horario', icon: Clock },
    { id: 4, label: 'Tus Datos', icon: Calendar }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Stepper */}
      <div className="flex justify-between items-center px-4 md:px-10">
        {steps.map((s, idx) => (
          <React.Fragment key={s.id}>
            <div className="flex flex-col items-center gap-2 z-10">
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-500",
                step === s.id ? "bg-primary border-primary text-white scale-110 shadow-lg" : 
                step > s.id ? "bg-green-500 border-green-500 text-white" : 
                "bg-white border-muted text-muted-foreground"
              )}>
                {step > s.id ? <Check className="h-5 w-5" /> : <s.icon className="h-5 w-5" />}
              </div>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest hidden md:block",
                step >= s.id ? "text-primary" : "text-muted-foreground"
              )}>
                {s.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div className="flex-1 h-0.5 bg-muted mx-2 -mt-4 md:-mt-6 relative">
                <div className={cn(
                  "absolute inset-0 bg-primary transition-all duration-700",
                  step > s.id ? "w-full" : "w-0"
                )} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-sm">
        <CardContent className="p-0">
          {step === 1 && <ServiceStep services={services} selection={bookingData.serviceId} onSelect={(s) => { updateBookingData({ serviceId: s.id, serviceName: s.name, price: s.price, durationMinutes: s.durationMinutes }); handleNext(); }} />}
          {step === 2 && <StaffStep staff={staff} serviceId={bookingData.serviceId} selection={bookingData.staffId} onSelect={(s) => { updateBookingData({ staffId: s.id, staffName: s.name }); handleNext(); }} onBack={handleBack} />}
          {step === 3 && <TimeStep businessId={businessId} bookingData={bookingData} onSelect={(time, end) => { updateBookingData({ startTime: time, endTime: end }); handleNext(); }} onBack={handleBack} />}
          {step === 4 && (
            <ContactStep 
              data={bookingData} 
              onUpdate={updateBookingData} 
              onConfirm={handleConfirm} 
              onBack={handleBack} 
              isSubmitting={isSubmitting}
              formatDate={formatReservationDate} 
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
