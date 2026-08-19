'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Phone, Mail, MessageSquare, ArrowLeft, Loader2, CheckCircle2, ShieldCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ContactStepProps {
  bookingData: any;
  onBack: () => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function ContactStep({ bookingData, onBack, onSubmit, isSubmitting }: ContactStepProps) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.customerPhone) return;
    onSubmit(formData);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      {/* Resumen Móvil/Lateral */}
      <div className="space-y-6 order-2 lg:order-1">
        <Card className="rounded-[2rem] border-2 border-primary/10 bg-primary/5 shadow-inner overflow-hidden">
          <CardHeader className="bg-white border-b pb-6">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Resumen de tu turno</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-2xl shadow-sm border"><Clock className="h-6 w-6 text-primary" /></div>
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Fecha y Hora</p>
                <p className="font-bold text-gray-900">{bookingData.date} • {bookingData.startTime}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-2xl shadow-sm border"><ShieldCheck className="h-6 w-6 text-primary" /></div>
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Servicio</p>
                <p className="font-bold text-gray-900">{bookingData.serviceName}</p>
                <p className="text-sm font-black text-primary mt-1">{formatCurrency(bookingData.price)}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 border-t pt-6">
               <div className="p-3 bg-white rounded-2xl shadow-sm border"><User className="h-6 w-6 text-primary" /></div>
               <div>
                 <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Profesional</p>
                 <p className="font-bold text-gray-900">{bookingData.staffName}</p>
               </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border text-xs text-muted-foreground">
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          Te enviaremos una confirmación por WhatsApp una vez que el profesional revise la solicitud.
        </div>
      </div>

      {/* Formulario */}
      <Card className="rounded-[2rem] shadow-xl border-none order-1 lg:order-2">
        <CardHeader className="p-8 pb-4 relative">
          <Button variant="ghost" size="icon" onClick={onBack} className="absolute left-4 top-4 h-10 w-10 rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="text-2xl font-black text-center">Tus Datos de Contacto</CardTitle>
          <CardDescription className="text-center">Completa esta información para finalizar tu reserva.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="p-8 pt-4 space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest ml-1">Nombre Completo *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  required
                  placeholder="Ej: Juan Pérez"
                  className="pl-10 h-12 bg-muted/30 border-none rounded-xl"
                  value={formData.customerName}
                  onChange={e => setFormData({...formData, customerName: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest ml-1">WhatsApp *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  required
                  type="tel"
                  placeholder="300 123 4567"
                  className="pl-10 h-12 bg-muted/30 border-none rounded-xl"
                  value={formData.customerPhone}
                  onChange={e => setFormData({...formData, customerPhone: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest ml-1">Correo Electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="email"
                  placeholder="tu@email.com (opcional)"
                  className="pl-10 h-12 bg-muted/30 border-none rounded-xl"
                  value={formData.customerEmail}
                  onChange={e => setFormData({...formData, customerEmail: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest ml-1">Notas Adicionales</Label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea 
                  placeholder="¿Algún requerimiento especial?"
                  className="pl-10 min-h-[100px] bg-muted/30 border-none rounded-xl resize-none"
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="p-8 pt-0">
            <Button 
              type="submit" 
              className="w-full h-14 text-lg font-black shadow-2xl shadow-primary/20 rounded-2xl transition-transform active:scale-95"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Confirmar mi cita
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default ContactStep;
