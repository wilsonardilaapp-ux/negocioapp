'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Loader2
} from "lucide-react";
import { cn, formatReservationDate } from "@/lib/utils";

interface ContactStepProps {
  bookingData: any;
  onBack: () => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function ContactStep({ bookingData = {}, onBack, onSubmit, isSubmitting }: ContactStepProps) {
  const [formData, setFormData] = useState({
    customerName: bookingData?.customerName || '',
    customerPhone: bookingData?.customerPhone || '',
    customerEmail: bookingData?.customerEmail || '',
    notes: bookingData?.notes || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isFormValid = formData.customerName.trim().length >= 3 && formData.customerPhone.trim().length >= 7;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-start animate-in fade-in duration-500">
      {/* Columna Izquierda: Formulario */}
      <div className="lg:col-span-2">
        <Card className="rounded-[2rem] border-gray-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/20 pb-8 relative">
            <button
              onClick={onBack}
              className="absolute left-6 top-6 p-2 rounded-full hover:bg-white/50 text-gray-500 hover:text-gray-900 transition-colors"
              aria-label="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="text-center space-y-2 pt-4">
              <CardTitle className="text-2xl sm:text-3xl font-black text-gray-900">Tus Datos de Contacto</CardTitle>
              <CardDescription className="text-sm font-medium">Completa la información para finalizar tu reservación.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <form id="contact-form" onSubmit={handleFormSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="customerName" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-primary" /> Nombre Completo *
                  </Label>
                  <Input
                    id="customerName"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleChange}
                    placeholder="Ej: Juan Pérez"
                    className="h-12 rounded-xl bg-muted/10 border-2 focus-visible:ring-primary/20"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-primary" /> WhatsApp / Celular *
                  </Label>
                  <Input
                    id="customerPhone"
                    name="customerPhone"
                    type="tel"
                    value={formData.customerPhone}
                    onChange={handleChange}
                    placeholder="Ej: 300 123 4567"
                    className="h-12 rounded-xl bg-muted/10 border-2 focus-visible:ring-primary/20"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerEmail" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-primary" /> Correo Electrónico (Opcional)
                </Label>
                <Input
                  id="customerEmail"
                  name="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={handleChange}
                  placeholder="tu@correo.com"
                  className="h-12 rounded-xl bg-muted/10 border-2 focus-visible:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-primary" /> Notas o Requerimientos
                </Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="¿Algún detalle especial que debamos saber?"
                  className="min-h-[100px] rounded-xl bg-muted/10 border-2 focus-visible:ring-primary/20 resize-none"
                />
              </div>
            </form>
          </CardContent>
          <CardFooter className="bg-muted/10 p-8 flex flex-col sm:flex-row gap-4 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              className="font-bold h-12 px-8 order-2 sm:order-1"
            >
              Volver
            </Button>
            <Button
              type="submit"
              form="contact-form"
              disabled={!isFormValid || isSubmitting}
              className="flex-1 h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/10 order-1 sm:order-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Procesando Reserva...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  Confirmar mi cita
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Columna Derecha: Resumen */}
      <div className="lg:col-span-1">
        <Card className="rounded-[2.5rem] border-2 border-primary/10 shadow-lg bg-white overflow-hidden sticky top-24">
          <CardHeader className="bg-primary/5 pb-4">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Resumen de tu Turno</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Servicio</p>
                  <p className="font-bold text-gray-900 leading-tight">{bookingData.serviceName || 'Cargando...'}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Fecha y Hora</p>
                  <div className="flex items-center gap-1 font-bold text-gray-900 leading-tight">
                    <span className="capitalize">{bookingData.date ? formatReservationDate(bookingData.date) : '--'}</span>
                    <span>•</span>
                    <span>{bookingData.startTime}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Profesional</p>
                  <p className="font-bold text-gray-900 leading-tight">{bookingData.staffName || 'Asignación Automática'}</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-dashed">
              <div className="flex justify-between items-center">
                <span className="font-black text-gray-900 uppercase text-xs tracking-widest">Total a pagar</span>
                <span className="text-2xl font-black text-primary">{formatCurrency(bookingData.price || 0)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 italic text-center font-medium">
                Pagarás directamente en el local el día de tu cita.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ContactStep;
