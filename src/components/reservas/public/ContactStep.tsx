'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn, formatReservationDate } from "@/lib/utils";
import { User, Mail, Phone, FileText, Calendar, Clock, ArrowLeft, Check, Sparkles, ShieldCheck } from "lucide-react";
import type { Reservation, BookingService, BookingStaff } from "@/models/booking";

interface ContactStepProps {
  bookingData: Partial<Reservation>;
  selectedService: BookingService | null;
  selectedStaff: BookingStaff | null;
  onConfirm: (contactData: { customerName: string; customerPhone: string; customerEmail: string; notes: string }) => Promise<void>;
  onBack: () => void;
  isSubmitting: boolean;
}

export function ContactStep({
  bookingData,
  selectedService,
  selectedStaff,
  onConfirm,
  onBack,
  isSubmitting
}: ContactStepProps) {
  const [formData, setFormData] = React.useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(formData);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="lg:col-span-2 space-y-6">
        <Card className="rounded-3xl border-none shadow-xl shadow-primary/5">
          <CardHeader>
            <CardTitle className="text-2xl font-black">Tus Datos de Contacto</CardTitle>
            <CardDescription>Completa esta información para confirmar tu cita.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName" className="flex items-center gap-2 font-bold text-xs uppercase text-muted-foreground">
                    <User className="h-3 w-3" /> Nombre Completo *
                  </Label>
                  <Input
                    id="customerName"
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="Ej. Juan Pérez"
                    className="rounded-xl h-12 border-2 focus-visible:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone" className="flex items-center gap-2 font-bold text-xs uppercase text-muted-foreground">
                    <Phone className="h-3 w-3" /> WhatsApp / Teléfono *
                  </Label>
                  <Input
                    id="customerPhone"
                    required
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    placeholder="Ej. 300 123 4567"
                    className="rounded-xl h-12 border-2 focus-visible:ring-primary/20"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail" className="flex items-center gap-2 font-bold text-xs uppercase text-muted-foreground">
                  <Mail className="h-3 w-3" /> Correo Electrónico
                </Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  placeholder="tu@email.com"
                  className="rounded-xl h-12 border-2 focus-visible:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className="flex items-center gap-2 font-bold text-xs uppercase text-muted-foreground">
                  <FileText className="h-3 w-3" /> Notas adicionales (Opcional)
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Algún requerimiento especial para tu cita..."
                  className="rounded-xl min-h-[100px] border-2 focus-visible:ring-primary/20 resize-none"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-3 bg-muted/20 border-t p-6">
              <Button type="button" variant="ghost" onClick={onBack} disabled={isSubmitting} className="font-bold w-full sm:w-auto order-2 sm:order-1">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.customerName || !formData.customerPhone} className="w-full sm:flex-1 h-12 text-lg font-black shadow-lg shadow-primary/10 order-1 sm:order-2">
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Procesando...</>
                ) : (
                  <><Check className="mr-2 h-5 w-5" /> Confirmar mi cita</>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="rounded-3xl border-2 border-primary/10 shadow-lg sticky top-24 overflow-hidden">
          <CardHeader className="bg-primary/5 border-b pb-4">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Resumen de Reserva
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Servicio</span>
              <p className="font-bold text-gray-900">{selectedService?.name || '---'}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Especialista</span>
              <p className="font-medium text-gray-700">{selectedStaff?.name || 'Cualquier profesional'}</p>
            </div>
            
            <Separator className="border-dashed" />
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Fecha</span>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <Calendar className="h-3 w-3 text-primary" />
                  {bookingData.date ? formatReservationDate(bookingData.date) : '---'}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Hora</span>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <Clock className="h-3 w-3 text-primary" />
                  {bookingData.startTime || '---'}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-dashed flex justify-between items-center">
              <span className="text-xs font-black uppercase text-gray-900">Total a pagar</span>
              <span className="text-xl font-black text-primary">{formatCurrency(selectedService?.price || 0)}</span>
            </div>
          </CardContent>
          <CardFooter className="bg-blue-50 py-3 px-6 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
            <p className="text-[10px] text-blue-800 font-medium leading-tight">
              Tu reserva será confirmada de inmediato y recibirás un aviso por WhatsApp.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default ContactStep;