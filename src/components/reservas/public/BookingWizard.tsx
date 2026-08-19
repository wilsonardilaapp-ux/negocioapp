'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Clock, 
  User, 
  Tag, 
  CheckCircle2, 
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import type { BookingService, BookingStaff, BookingAvailability, Reservation } from '@/models/booking';
import { confirmPublicBooking } from '@/actions/public-booking';

// Steps components
import { ServiceStep } from './ServiceStep';
import { StaffStep } from './StaffStep';
import { TimeStep } from './TimeStep';
import { ContactStep } from './ContactStep';
import { SuccessView } from './SuccessView';

interface BookingWizardProps {
  businessId: string;
  services: BookingService[];
  staff: BookingStaff[];
  initialServiceId?: string;
}

/**
 * Helper resiliente para formatear fechas de reserva (objetos o strings)
 */
const formatReservationDate = (dateVal: any) => {
  try {
    if (!dateVal) return "";
    const d = typeof dateVal === 'string' 
      ? new Date(dateVal.includes('T') ? dateVal : `${dateVal}T00:00:00`) 
      : new Date(dateVal);
    
    if (isNaN(d.getTime())) return String(dateVal);
    return format(d, "EEEE, d 'de' MMMM", { locale: es });
  } catch {
    return String(dateVal || "");
  }
};

export function BookingWizard({ businessId, services, staff, initialServiceId }: BookingWizardProps) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdReservation, setCreatedReservation] = useState<Reservation | null>(null);

  const [bookingData, setBookingData] = useState<Partial<Reservation>>({
    serviceId: initialServiceId || '',
    staffId: '',
    date: '',
    startTime: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    notes: '',
  });

  useEffect(() => {
    setMounted(true);
    if (initialServiceId) setStep(2);
  }, [initialServiceId]);

  const selectedService = services.find(s => s.id === bookingData.serviceId);
  const selectedStaff = staff.find(s => s.id === bookingData.staffId);

  const handleSelectService = (id: string) => {
    setBookingData(prev => ({ ...prev, serviceId: id, staffId: '' }));
    setStep(2);
  };

  const handleSelectStaff = (id: string) => {
    setBookingData(prev => ({ ...prev, staffId: id }));
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

  const handleConfirmBooking = async () => {
    setIsSubmitting(true);
    try {
      const res = await confirmPublicBooking(businessId, bookingData);
      
      if (res.success) {
        setCreatedReservation(res.reservation as Reservation);
        setStep(5);
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
        description: err?.message || "Ocurrió un error técnico inesperado.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  // Renderizar Resumen para pasos avanzados
  const renderSummary = () => {
    if (step < 2 || step > 4) return null;
    return (
      <Card className="rounded-3xl border-none shadow-lg bg-white overflow-hidden animate-in slide-in-from-top-2 duration-500">
        <CardHeader className="bg-primary p-6">
          <CardTitle className="text-white text-sm font-black uppercase tracking-[0.2em]">Resumen de tu Turno</CardTitle>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {selectedService && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Servicio</span>
              <p className="font-black text-gray-900 truncate">{selectedService.name}</p>
            </div>
          )}
          {selectedStaff && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Profesional</span>
              <p className="font-bold text-gray-700 truncate">{selectedStaff.name}</p>
            </div>
          )}
          {bookingData.startTime && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Fecha y Hora</span>
              <div className="flex items-center gap-1 font-black text-primary capitalize">
                <span>{bookingData.date ? formatReservationDate(bookingData.date) : ''}</span>
                <span>•</span>
                <span>{bookingData.startTime}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Indicador de Pasos */}
      {step < 5 && (
        <div className="flex justify-center items-center gap-4 mb-10">
          {[1, 2, 3, 4].map((s) => (
            <React.Fragment key={s}>
              <div 
                className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center font-black transition-all duration-300",
                  step === s ? "bg-primary text-white scale-110 shadow-lg shadow-primary/20" : 
                  step > s ? "bg-green-500 text-white" : "bg-white border-2 text-muted-foreground"
                )}
              >
                {step > s ? <Check className="h-5 w-5" /> : s}
              </div>
              {s < 4 && <div className={cn("h-1 w-8 sm:w-16 rounded-full transition-colors duration-500", step > s ? "bg-green-500" : "bg-muted")} />}
            </React.Fragment>
          ))}
        </div>
      )}

      {renderSummary()}

      <div className="min-h-[400px]">
        {step === 1 && <ServiceStep services={services} onSelect={handleSelectService} />}
        {step === 2 && <StaffStep staff={staff.filter(s => s.assignedServiceIds.includes(bookingData.serviceId!))} onSelect={handleSelectStaff} onBack={() => setStep(1)} />}
        {step === 3 && (
          <TimeStep 
            businessId={businessId}
            selectedService={selectedService!}
            selectedStaff={selectedStaff!}
            availabilityList={[]} // En producción esto se recuperaría vía hooks o props
            existingReservations={[]}
            onSelectDateTime={handleSelectDateTime}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <ContactStep 
            onSubmit={async (data) => {
              setBookingData(prev => ({ ...prev, ...data }));
              // El botón de confirmar ejecuta handleConfirmBooking
            }}
            onConfirm={handleConfirmBooking}
            isSubmitting={isSubmitting}
            onBack={() => setStep(3)}
          />
        )}
        {step === 5 && createdReservation && <SuccessView reservation={createdReservation} />}
      </div>
    </div>
  );
}
