
'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  User, 
  Mail, 
  Phone, 
  FileText, 
  Calendar, 
  Clock, 
  ArrowLeft, 
  Check, 
  Sparkles,
  ShieldCheck,
  Loader2
} from "lucide-react";
import { cn, formatReservationDate } from "@/lib/utils";
import type { Reservation, BookingService, BookingStaff } from '@/models/booking';

const contactSchema = z.object({
  customerName: z.string().min(3, "Por favor, ingresa tu nombre completo."),
  customerPhone: z.string().min(10, "Ingresa un número de WhatsApp válido."),
  customerEmail: z.string().email("Correo electrónico no válido."),
  notes: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

export interface ContactStepProps {
  bookingData: Partial<Reservation>;
  selectedService: BookingService | null;
  selectedStaff: BookingStaff | null;
  onConfirm: (contactData: ContactFormData) => Promise<void>;
  onBack: () => void;
  isSubmitting: boolean;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value);
};

export function ContactStep({ 
  bookingData, 
  selectedService, 
  selectedStaff, 
  onConfirm, 
  onBack, 
  isSubmitting 
}: ContactStepProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Formulario */}
      <Card className="lg:col-span-2 rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
        <CardHeader className="bg-primary/5 border-b p-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm border border-primary/20">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-black tracking-tight">Finaliza tu Reserva</CardTitle>
              <CardDescription className="text-sm font-medium">Ingresa tus datos para confirmar tu espacio.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <form id="contact-form" onSubmit={handleSubmit(onConfirm)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="customerName" className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-muted-foreground ml-1">
                  <User className="h-3 w-3" /> Nombre Completo
                </Label>
                <Input 
                  id="customerName" 
                  {...register('customerName')} 
                  placeholder="Tu nombre..." 
                  className="h-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary/20"
                />
                {errors.customerName && <p className="text-[10px] text-red-500 font-bold ml-2">{errors.customerName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerPhone" className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-muted-foreground ml-1">
                  <Phone className="h-3 w-3" /> WhatsApp
                </Label>
                <Input 
                  id="customerPhone" 
                  {...register('customerPhone')} 
                  placeholder="300 123 4567" 
                  className="h-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary/20"
                />
                {errors.customerPhone && <p className="text-[10px] text-red-500 font-bold ml-2">{errors.customerPhone.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerEmail" className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-muted-foreground ml-1">
                <Mail className="h-3 w-3" /> Correo Electrónico
              </Label>
              <Input 
                id="customerEmail" 
                type="email"
                {...register('customerEmail')} 
                placeholder="tu@correo.com" 
                className="h-12 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary/20"
              />
              {errors.customerEmail && <p className="text-[10px] text-red-500 font-bold ml-2">{errors.customerEmail.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest text-muted-foreground ml-1">
                <FileText className="h-3 w-3" /> Notas adicionales (opcional)
              </Label>
              <Textarea 
                id="notes" 
                {...register('notes')} 
                placeholder="¿Alguna instrucción especial?" 
                className="min-h-[100px] rounded-2xl bg-muted/30 border-none focus-visible:ring-primary/20 resize-none"
              />
            </div>
          </form>
        </CardContent>
        <CardFooter className="bg-muted/10 border-t p-8 flex flex-col sm:flex-row gap-4">
           <Button variant="ghost" onClick={onBack} disabled={isSubmitting} className="font-bold w-full sm:w-auto h-12 rounded-2xl">
             <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
           </Button>
           <Button 
            form="contact-form"
            type="submit" 
            disabled={isSubmitting} 
            className="flex-1 h-12 font-black text-base shadow-xl shadow-primary/20 rounded-2xl"
           >
             {isSubmitting ? (
               <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Procesando...</>
             ) : (
               <><Check className="mr-2 h-5 w-5" /> Confirmar mi cita</>
             )}
           </Button>
        </CardFooter>
      </Card>

      {/* Resumen Sidebar */}
      <div className="space-y-6">
        <Card className="rounded-[2rem] border-2 border-primary/10 shadow-lg bg-white overflow-hidden">
          <CardHeader className="bg-primary pb-6 text-white">
            <CardTitle className="text-xl font-black flex items-center gap-2 uppercase tracking-tighter">
              <Sparkles className="h-5 w-5 fill-white" /> Tu Cita
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
                <div className="flex items-start gap-3">
                   <div className="p-2 bg-primary/5 rounded-xl border border-primary/10"><Calendar className="h-4 w-4 text-primary" /></div>
                   <div className="flex flex-col"><span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Fecha</span><span className="text-sm font-bold text-gray-900">{bookingData.date ? formatReservationDate(bookingData.date) : '--'}</span></div>
                </div>
                <div className="flex items-start gap-3">
                   <div className="p-2 bg-primary/5 rounded-xl border border-primary/10"><Clock className="h-4 w-4 text-primary" /></div>
                   <div className="flex flex-col"><span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Hora</span><span className="text-sm font-bold text-gray-900">{bookingData.startTime}</span></div>
                </div>
                <Separator className="border-dashed" />
                <div className="space-y-1">
                   <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Servicio</span>
                   <p className="font-bold text-gray-800">{selectedService?.name}</p>
                   <p className="text-[11px] text-muted-foreground font-medium">{selectedService?.durationMinutes} minutos de atención</p>
                </div>
                <div className="space-y-1">
                   <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Profesional</span>
                   <p className="font-bold text-gray-800">{selectedStaff?.name || 'Asignación automática'}</p>
                </div>
            </div>

            <div className="p-4 bg-primary/5 rounded-2xl border-2 border-primary/20 text-center space-y-1">
               <span className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Total a Pagar</span>
               <p className="text-3xl font-black text-primary">{selectedService ? formatCurrency(selectedService.price) : '--'}</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border shadow-sm">
           <ShieldCheck className="h-10 w-10 text-green-500 shrink-0" />
           <p className="text-[10px] font-medium text-gray-500 leading-tight">Tu información está protegida. Al agendar recibirás un recordatorio por WhatsApp.</p>
        </div>
      </div>
    </div>
  );
}

export default ContactStep;
