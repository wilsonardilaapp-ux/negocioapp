'use client';

import React, { useState, useEffect } from 'react';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { 
    Check, 
    User, 
    Clock, 
    Calendar, 
    ArrowLeft, 
    ArrowRight, 
    Loader2, 
    ShieldCheck, 
    CheckCircle2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ServiceStep } from './ServiceStep';
import { StaffStep } from './StaffStep';
import { TimeStep } from './TimeStep';
import { ContactStep } from './ContactStep';
import { SuccessView } from './SuccessView';
import { confirmPublicBooking } from '@/actions/public-booking';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import type { BookingService, BookingStaff, BookingAvailability, Reservation } from '@/models/booking';

const STEPS = [
    { s: 1, label: "SERVICIO", icon: Check },
    { s: 2, label: "PROFESIONAL", icon: User },
    { s: 3, label: "HORARIO", icon: Clock },
    { s: 4, label: "TUS DATOS", icon: Calendar },
];

export function BookingWizard({ businessId, services, staff }: { businessId: string, services: BookingService[], staff: BookingStaff[] }) {
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createdReservation, setCreatedReservation] = useState<Reservation | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const [bookingData, setBookingData] = useState({
        serviceId: '',
        serviceName: '',
        price: 0,
        durationMinutes: 30,
        staffId: 'any',
        staffName: 'Cualquier Profesional',
        date: '',
        startTime: '',
        endTime: '',
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        notes: '',
    });

    const firestore = useFirestore();

    const availabilityQuery = useMemoFirebase(() => 
        businessId ? collection(firestore, `businesses/${businessId}/bookingAvailability`) : null, 
    [businessId, firestore]);
    
    const reservationsQuery = useMemoFirebase(() => 
        businessId ? collection(firestore, `businesses/${businessId}/reservations`) : null, 
    [businessId, firestore]);

    const { data: availabilityList } = useCollection<BookingAvailability>(availabilityQuery);
    const { data: allReservations } = useCollection<Reservation>(reservationsQuery);

    const formatReservationDate = (dateVal: any) => {
        try {
            if (!dateVal) return "";
            const d = typeof dateVal === 'string' ? new Date(dateVal.includes('T') ? dateVal : `${dateVal}T00:00:00`) : new Date(dateVal);
            if (isNaN(d.getTime())) return String(dateVal);
            return format(d, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
        } catch {
            return String(dateVal || "");
        }
    };

    const handleConfirm = async () => {
        setIsSubmitting(true);
        try {
            const res = await confirmPublicBooking(businessId, bookingData);
            if (res.success) {
                setCreatedReservation(res.reservation);
                setStep(5);
            } else {
                toast({ variant: "destructive", title: "Error al agendar", description: res.error });
            }
        } catch (err: any) {
            toast({ variant: "destructive", title: "Error de conexión", description: err?.message || "Ocurrió un error inesperado." });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!mounted) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

    if (step === 5 && createdReservation) {
        return <SuccessView reservation={createdReservation} businessId={businessId} />;
    }

    const selectedService = services.find(s => s.id === bookingData.serviceId);
    const selectedStaff = staff.find(s => s.id === bookingData.staffId) || null;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Stepper */}
            <div className="flex items-center justify-between px-4 sm:px-10 relative">
                <div className="absolute top-5 left-10 right-10 h-0.5 bg-muted -z-0 hidden sm:block"></div>
                {STEPS.map((item) => {
                    const Icon = item.icon;
                    const isActive = step === item.s;
                    const isCompleted = step > item.s;
                    return (
                        <div key={item.s} className="flex flex-col items-center gap-2 z-10">
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center transition-all border-2",
                                isCompleted ? "bg-primary border-primary text-white" :
                                isActive ? "bg-white border-primary text-primary shadow-lg shadow-primary/20 scale-110" :
                                "bg-white border-muted text-muted-foreground"
                            )}>
                                {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                            </div>
                            <span className={cn("text-[9px] font-black tracking-widest", isActive || isCompleted ? "text-primary" : "text-muted-foreground")}>
                                {item.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Render Steps */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {step === 1 && (
                    <ServiceStep 
                        services={services} 
                        onSelect={(s) => {
                            setBookingData(prev => ({ ...prev, serviceId: s.id, serviceName: s.name, price: s.price, durationMinutes: s.durationMinutes }));
                            setStep(2);
                        }} 
                    />
                )}
                {step === 2 && (
                    <StaffStep 
                        staffList={staff.filter(s => s.assignedServiceIds.includes(bookingData.serviceId))}
                        selectedStaffId={bookingData.staffId}
                        onSelectStaff={(id, s) => {
                            setBookingData(prev => ({ ...prev, staffId: id, staffName: s?.name || 'Cualquier Profesional' }));
                            setStep(3);
                        }}
                        onBack={() => setStep(1)}
                    />
                )}
                {step === 3 && selectedService && (
                    <TimeStep 
                        selectedService={selectedService}
                        selectedStaff={selectedStaff}
                        availabilityList={availabilityList || []}
                        existingReservations={allReservations || []}
                        onSelectDateTime={(data) => {
                            setBookingData(prev => ({ ...prev, ...data }));
                            setStep(4);
                        }}
                        onBack={() => setStep(2)}
                    />
                )}
                {step === 4 && (
                    <ContactStep 
                        bookingData={bookingData}
                        setBookingData={setBookingData}
                        onConfirm={handleConfirm}
                        onBack={() => setStep(3)}
                        isSubmitting={isSubmitting}
                        formatDate={formatReservationDate}
                    />
                )}
            </div>
        </div>
    );
}