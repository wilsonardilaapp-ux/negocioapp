'use client';

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
    User, 
    Mail, 
    Phone, 
    FileText, 
    ArrowLeft, 
    Check, 
    Sparkles, 
    Calendar, 
    Clock, 
    Loader2 
} from "lucide-react";
import type { BookingService, BookingStaff, Reservation } from "@/models/booking";
import { cn, formatReservationDate } from "@/lib/utils";

const contactSchema = z.object({
  customerName: z.string().min(3, "Por favor, ingresa tu nombre completo."),
  customerPhone: z.string().min(10, "Ingresa un número de WhatsApp válido (10 dígitos)."),
  customerEmail: z.string().email("Ingresa un correo electrónico válido."),
  notes: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactStepProps {
  bookingData: Partial<Reservation>;
  selectedService: BookingService | null;
  selectedStaff: BookingStaff | null;
  onConfirm: (data: ContactFormData) => Promise<void>;
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
  isSubmitting,
}: ContactStepProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Formulario */}
      <div className="lg:col-span-2 space-y-6">
        <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900">Tus datos de contacto</h2>
            <p className="text-muted-foreground">Completa tu información para enviarte el recordatorio de tu cita.</p>
        </div>

        <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
          <form onSubmit={handleSubmit(onConfirm)}>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="customerName" className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <User className="h-3 w-3" /> Nombre Completo *
                  </Label>
                  <Input 
                    id="customerName" 
                    {...register("customerName")} 
                    placeholder="Ej: Juan Pérez" 
                    className="h-12 rounded-xl bg-muted/30 border-none focus-visible:ring-primary/20"
                  />
                  {errors.customerName && <p className="text-xs text-destructive font-bold">{errors.customerName.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerPhone" className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Phone className="h-3 w-3" /> WhatsApp *
                  </Label>
                  <Input 
                    id="customerPhone" 
                    {...register("customerPhone")} 
                    placeholder="300 123 4567" 
                    className="h-12 rounded-xl bg-muted/30 border-none focus-visible:ring-primary/20"
                  />
                  {errors.customerPhone && <p className="text-xs text-destructive font-bold">{errors.customerPhone.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerEmail" className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Mail className="h-3 w-3" /> Correo Electrónico *
                </Label>
                <Input 
                  id="customerEmail" 
                  type="email" 
                  {...register("customerEmail")} 
                  placeholder="tu@correo.com" 
                  className="h-12 rounded-xl bg-muted/30 border-none focus-visible:ring-primary/20"
                />
                {errors.customerEmail && <p className="text-xs text-destructive font-bold">{errors.customerEmail.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <FileText className="h-3 w-3" /> Notas adicionales (Opcional)
                </Label>
                <Textarea 
                  id="notes" 
                  {...register("notes")} 
                  placeholder="¿Algún requerimiento especial?" 
                  className="h-32 rounded-xl bg-muted/30 border-none focus-visible:ring-primary/20 resize-none"
                />
              </div>
            </CardContent>
            
            <CardFooter className="bg-muted/20 border-t p-8 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <Button type="button" variant="ghost" onClick={onBack} disabled={isSubmitting} className="font-bold text-muted-foreground order-2 sm:order-1">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Cambiar fecha
                </Button>
                <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full sm:w-auto h-14 px-12 text-lg font-black rounded-2xl shadow-xl shadow-primary/20 order-1 sm:order-2"
                >
                    {isSubmitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Procesando...</> : <><Check className="mr-2 h-5 w-5" /> Confirmar mi cita</>}
                </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* Resumen Sidebar */}
      <div className="lg:col-span-1">
        <Card className="sticky top-24 border-2 border-primary/10 shadow-lg rounded-[2.5rem] overflow-hidden bg-white">
            <CardHeader className="bg-primary/5 border-b pb-6">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Sparkles className="h-4 w-4 fill-primary" /> Resumen de Reserva
                </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
                <div className="space-y-4">
                    <div className="space-y-1">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Servicio</Label>
                        <p className="font-bold text-gray-900">{selectedService?.name || '--'}</p>
                        <Badge variant="secondary" className="text-[10px] py-0">{selectedService?.durationMinutes} min</Badge>
                    </div>

                    <Separator className="border-dashed" />

                    <div className="space-y-1">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Especialista</Label>
                        <p className="font-bold text-gray-900">{selectedStaff?.name || 'Cualquier Profesional'}</p>
                    </div>

                    <Separator className="border-dashed" />

                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Fecha</span>
                                <span className="text-xs font-black">{bookingData.date ? formatReservationDate(bookingData.date) : '--'}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                                <Clock className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Hora</span>
                                <span className="text-xs font-black">{bookingData.startTime || '--'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t-2 border-primary/10">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total a pagar</span>
                        <span className="text-2xl font-black text-primary">
                            {selectedService ? formatCurrency(selectedService.price) : '--'}
                        </span>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-2 italic">* El pago se realiza directamente en el establecimiento.</p>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ContactStep;
