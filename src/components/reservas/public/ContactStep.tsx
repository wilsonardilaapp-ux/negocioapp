'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { cn, formatReservationDate } from "../../../lib/utils";

interface ContactStepProps {
  bookingData: any;
  onBack: () => void;
  onSubmit: (formData: any) => void;
  isSubmitting: boolean;
}

export function ContactStep({ bookingData, onBack, onSubmit, isSubmitting }: ContactStepProps) {
  const [formData, setFormData] = useState({
    customerName: bookingData?.customerName || '',
    customerEmail: bookingData?.customerEmail || '',
    customerPhone: bookingData?.customerPhone || '',
    notes: bookingData?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isFormValid = formData.customerName.length >= 3 && formData.customerPhone.length >= 7;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-start">
      <div className="lg:col-span-2">
        <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden">
          <CardHeader className="bg-primary/5 border-b p-8">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack} disabled={isSubmitting} className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <CardTitle className="text-2xl font-black">Finaliza tu Reserva</CardTitle>
                <CardDescription>Completa tus datos para confirmar tu espacio.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                    <User className="h-3 w-3" /> Tu Nombre *
                  </Label>
                  <Input 
                    required
                    value={formData.customerName}
                    onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                    placeholder="Ej: Juan Pérez"
                    className="h-12 bg-muted/30 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                    <Phone className="h-3 w-3" /> WhatsApp *
                  </Label>
                  <Input 
                    required
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                    placeholder="300 123 4567"
                    className="h-12 bg-muted/30 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                  <Mail className="h-3 w-3" /> Correo Electrónico
                </Label>
                <Input 
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                  placeholder="tu@correo.com"
                  className="h-12 bg-muted/30 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                  <FileText className="h-3 w-3" /> Notas adicionales
                </Label>
                <Textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="¿Algo que debamos saber antes de tu cita?"
                  className="bg-muted/30 rounded-xl min-h-[100px] resize-none"
                />
              </div>
            </CardContent>
            <CardFooter className="p-8 bg-muted/20 border-t">
              <Button 
                type="submit" 
                disabled={!isFormValid || isSubmitting} 
                className="w-full h-14 text-lg font-black rounded-2xl shadow-lg shadow-primary/20"
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
      </div>

      {/* Resumen Lateral */}
      <div className="lg:col-span-1">
        <Card className="rounded-[2rem] border-2 border-primary/10 shadow-lg overflow-hidden sticky top-24">
          <CardHeader className="bg-primary/5 border-b pb-4">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Resumen del Turno</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-lg"><Sparkles className="h-4 w-4 text-primary" /></div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Servicio</p>
                  <p className="font-bold text-sm">{bookingData?.serviceName || '---'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-lg"><User className="h-4 w-4 text-primary" /></div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Profesional</p>
                  <p className="font-bold text-sm">{bookingData?.staffName || 'Cualquiera'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-lg"><Calendar className="h-4 w-4 text-primary" /></div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Fecha</p>
                  <p className="font-bold text-sm">
                    {bookingData?.date ? formatReservationDate(bookingData.date) : '---'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-lg"><Clock className="h-4 w-4 text-primary" /></div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Hora</p>
                  <p className="font-bold text-sm">{bookingData?.startTime || '---'}</p>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-dashed flex justify-between items-center">
              <span className="text-sm font-bold text-gray-900">Total a pagar</span>
              <span className="text-xl font-black text-primary">
                ${(bookingData?.price || 0).toLocaleString('es-CO')}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ContactStep;
