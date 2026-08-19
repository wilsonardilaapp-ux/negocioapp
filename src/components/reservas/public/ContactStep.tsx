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
  Calendar, 
  Clock, 
  ArrowLeft, 
  Check, 
  Sparkles,
  Tag,
  UserCheck,
  Loader2
} from "lucide-react";
import { cn, formatReservationDate } from "@/lib/utils";
import type { Reservation, BookingService, BookingStaff } from "@/models/booking";

const contactSchema = z.object({
  customerName: z.string().min(3, "El nombre es requerido."),
  customerEmail: z.string().email("Por favor, introduce un correo válido."),
  customerPhone: z.string().min(10, "Ingresa un número de WhatsApp válido (mínimo 10 dígitos)."),
  notes: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactStepProps {
  bookingData: Partial<Reservation>;
  selectedService: BookingService | null;
  selectedStaff: BookingStaff | null;
  onConfirm: (data: ContactFormData) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function ContactStep({ bookingData, selectedService, selectedStaff, onConfirm, onBack, isSubmitting }: ContactStepProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Formulario de Contacto */}
      <Card className="lg:col-span-2 rounded-[2rem] border-none shadow-xl overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <CardTitle className="text-2xl font-black">Tus Datos de Contacto</CardTitle>
          <CardDescription className="text-sm font-medium">
            Completa la información para finalizar el agendamiento.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onConfirm)}>
          <CardContent className="p-8 pt-0 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="customerName" className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <User className="h-3 w-3" /> Nombre Completo *
                </Label>
                <Input 
                  id="customerName" 
                  {...register("customerName")} 
                  placeholder="Ej: Juan Pérez" 
                  className="h-12 rounded-xl bg-muted/20 border-transparent focus-visible:ring-primary/20"
                />
                {errors.customerName && <p className="text-xs text-red-500 font-bold">{errors.customerName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerPhone" className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Phone className="h-3 w-3" /> WhatsApp *
                </Label>
                <Input 
                  id="customerPhone" 
                  {...register("customerPhone")} 
                  placeholder="300 123 4567" 
                  className="h-12 rounded-xl bg-muted/20 border-transparent focus-visible:ring-primary/20"
                />
                {errors.customerPhone && <p className="text-xs text-red-500 font-bold">{errors.customerPhone.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerEmail" className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Mail className="h-3 w-3" /> Correo Electrónico *
              </Label>
              <Input 
                id="customerEmail" 
                {...register("customerEmail")} 
                placeholder="tu@email.com" 
                className="h-12 rounded-xl bg-muted/20 border-transparent focus-visible:ring-primary/20"
              />
              {errors.customerEmail && <p className="text-xs text-red-500 font-bold">{errors.customerEmail.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <FileText className="h-3 w-3" /> Notas o Requerimientos (Opcional)
              </Label>
              <Textarea 
                id="notes" 
                {...register("notes")} 
                placeholder="Ej: Prefiero lavado con agua tibia, tengo una alergia..." 
                className="min-h-[100px] rounded-xl bg-muted/20 border-transparent focus-visible:ring-primary/20 resize-none"
              />
            </div>
          </CardContent>

          <CardFooter className="p-8 pt-0 flex flex-col sm:flex-row gap-4">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onBack} 
              className="h-12 font-bold flex-1"
              disabled={isSubmitting}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
            <Button 
              type="submit" 
              className="h-12 font-black text-lg bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 flex-[2]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Procesando...</>
              ) : (
                <><Check className="mr-2 h-5 w-5" /> Confirmar mi cita</>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Resumen de la Reserva */}
      <div className="space-y-6">
        <Card className="rounded-[2rem] border-2 border-primary/10 shadow-lg overflow-hidden bg-white">
          <CardHeader className="bg-primary/5 border-b pb-6">
            <CardTitle className="text-lg font-black uppercase tracking-tight">Resumen de Reserva</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
               {/* Servicio */}
               <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary"><Tag className="h-5 w-5" /></div>
                  <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Servicio</span>
                      <span className="font-bold text-sm">{selectedService?.name || bookingData.serviceName}</span>
                  </div>
               </div>

               {/* Profesional */}
               <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary"><UserCheck className="h-5 w-5" /></div>
                  <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Atendido por</span>
                      <span className="font-bold text-sm">{selectedStaff?.name || bookingData.staffName}</span>
                  </div>
               </div>

               <Separator className="border-dashed" />

               {/* Fecha y Hora */}
               <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-xl text-muted-foreground"><Calendar className="h-4 w-4" /></div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Fecha</span>
                        <span className="font-bold text-xs">{bookingData.date ? formatReservationDate(bookingData.date) : '--'}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-muted rounded-xl text-muted-foreground"><Clock className="h-4 w-4" /></div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Hora</span>
                        <span className="font-bold text-xs">{bookingData.startTime || '--:--'}</span>
                    </div>
                  </div>
               </div>
            </div>

            <div className="pt-6 border-t border-dashed">
                <div className="flex justify-between items-center bg-primary/5 p-4 rounded-2xl">
                    <span className="text-xs font-bold text-primary uppercase">Total a pagar</span>
                    <span className="text-xl font-black text-primary">{formatCurrency(bookingData.price || 0)}</span>
                </div>
            </div>
          </CardContent>
        </Card>

        <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 flex gap-3 items-start animate-in fade-in duration-700">
            <Sparkles className="h-5 w-5 text-blue-600 shrink-0 mt-1" />
            <p className="text-xs text-blue-800 leading-relaxed font-medium">
                Recibirás un recordatorio por WhatsApp una vez que confirmemos tu espacio en la agenda.
            </p>
        </div>
      </div>
    </div>
  );
}

export default ContactStep;