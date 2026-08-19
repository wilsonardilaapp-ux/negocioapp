'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../ui/card";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Label } from "../../ui/label";
import { cn } from "../../../lib/utils";
import { User, Mail, Phone, FileText, Calendar, Clock, ArrowLeft, Check, Sparkles, Loader2 } from "lucide-react";

interface ContactStepProps {
  bookingData: any;
  onBack: () => void;
  onSubmit: (data: { customerName: string; customerPhone: string; customerEmail?: string; notes?: string }) => void;
  isSubmitting: boolean;
  formatReservationDate: (date: string) => string;
}

export function ContactStep({ bookingData, onBack, onSubmit, isSubmitting, formatReservationDate }: ContactStepProps) {
  const [name, setName] = useState(bookingData?.customerName || '');
  const [phone, setPhone] = useState(bookingData?.customerPhone || '');
  const [email, setEmail] = useState(bookingData?.customerEmail || '');
  const [notes, setNotes] = useState(bookingData?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    onSubmit({
      customerName: name,
      customerPhone: phone,
      customerEmail: email,
      notes,
    });
  };

  const isFormValid = name.trim().length >= 3 && phone.trim().length >= 7;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="lg:col-span-2">
        <Card className="rounded-[2rem] border-gray-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 pb-6 border-b">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onBack} 
                disabled={isSubmitting} 
                className="rounded-full"
                type="button"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <CardTitle className="text-2xl font-black">Tus Datos de Contacto</CardTitle>
                <CardDescription>Completa la información para confirmar tu cita.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="pt-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <User className="h-3 w-3 text-primary" /> Nombre Completo *
                  </Label>
                  <Input
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="h-12 rounded-xl bg-muted/20 border-transparent focus-visible:ring-primary/20"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <Phone className="h-3 w-3 text-primary" /> WhatsApp *
                  </Label>
                  <Input
                    id="phone"
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="300 123 4567"
                    className="h-12 rounded-xl bg-muted/20 border-transparent focus-visible:ring-primary/20"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <Mail className="h-3 w-3 text-primary" /> Correo Electrónico (Opcional)
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="h-12 rounded-xl bg-muted/20 border-transparent focus-visible:ring-primary/20"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <FileText className="h-3 w-3 text-primary" /> Notas o Comentarios
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Alguna observación adicional..."
                  className="min-h-[120px] rounded-2xl bg-muted/20 border-transparent focus-visible:ring-primary/20 resize-none"
                  disabled={isSubmitting}
                />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t p-6 sm:p-8">
              <Button
                type="submit"
                disabled={isSubmitting || !isFormValid}
                className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    Confirmar mi cita
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="rounded-[2rem] border-2 border-primary/20 bg-primary/5 shadow-inner p-6 sticky top-24">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-white rounded-xl shadow-sm border border-primary/10 text-primary">
              <Sparkles className="h-5 w-5 fill-primary" />
            </div>
            <h3 className="font-black text-primary uppercase tracking-widest text-sm">Resumen de tu turno</h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Servicio Seleccionado</span>
              <p className="font-bold text-gray-900 leading-tight">{bookingData?.serviceName || 'Servicio'}</p>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Especialista</span>
              <p className="font-bold text-gray-700">{bookingData?.staffName || 'Asignación automática'}</p>
            </div>

            <div className="pt-4 border-t border-primary/10">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center border shadow-sm text-primary">
                     <Calendar className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Fecha y Hora</span>
                    <div className="flex items-center gap-1 font-black text-sm text-gray-900">
                       <span>{bookingData?.date ? formatReservationDate(bookingData.date) : '---'}</span>
                       <span>•</span>
                       <span>{bookingData?.startTime || '--:--'}</span>
                    </div>
                  </div>
               </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border shadow-sm flex justify-between items-center">
              <span className="text-xs font-bold text-gray-500 uppercase">Total a pagar</span>
              <span className="text-xl font-black text-primary">
                ${(bookingData?.price || 0).toLocaleString('es-CO')}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default ContactStep;