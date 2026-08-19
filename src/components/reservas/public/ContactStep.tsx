'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Loader2, 
  Send, 
  User, 
  Smartphone, 
  Mail, 
  MessageSquare,
  CheckCircle2,
  Calendar,
  Clock,
  Briefcase,
  Tag
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ContactStepProps {
  bookingData: any; // Recibe el estado actual del wizard
  onBack: () => void;
  onSubmit: (data: { customerName: string, customerPhone: string, customerEmail?: string, notes?: string }) => void;
  isSubmitting: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

export function ContactStep({ bookingData = {}, onBack, onSubmit, isSubmitting }: ContactStepProps) {
  // BLINDAJE CRÍTICO: Protección mediante encadenamiento opcional y fallbacks para evitar TypeError
  const [customerName, setCustomerName] = useState(bookingData?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(bookingData?.customerPhone || '');
  const [customerEmail, setCustomerEmail] = useState(bookingData?.customerEmail || '');
  const [notes, setNotes] = useState(bookingData?.notes || '');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) return;
    
    onSubmit({
      customerName,
      customerPhone,
      customerEmail,
      notes
    });
  };

  const formatReservationDate = (dateVal: any) => {
    try {
      if (!dateVal) return "";
      const d = typeof dateVal === 'string' ? new Date(dateVal.includes('T') ? dateVal : `${dateVal}T00:00:00`) : new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return format(d, "EEEE, d 'de' MMMM", { locale: es });
    } catch {
      return String(dateVal || "");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start max-w-5xl mx-auto">
      
      {/* FORMULARIO DE DATOS */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 sm:p-8 relative">
           <button
             onClick={onBack}
             className="absolute left-6 top-6 p-2 rounded-full hover:bg-muted/50 text-gray-500 hover:text-gray-900 transition-colors"
             aria-label="Volver"
           >
             <ArrowLeft className="w-5 h-5" />
           </button>

           <div className="text-center mb-8">
             <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">Finaliza tu Reserva</h2>
             <p className="text-sm text-muted-foreground">Completa tus datos para enviarte la confirmación por WhatsApp.</p>
           </div>

           <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="cust-name" className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                    <User className="h-3 w-3 text-primary" /> Nombre Completo *
                  </Label>
                  <Input 
                    id="cust-name"
                    placeholder="Ej: Juan Pérez"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                    className="h-12 rounded-xl bg-muted/20 border-transparent focus-visible:ring-primary/20"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cust-phone" className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                    <Smartphone className="h-3 w-3 text-primary" /> WhatsApp *
                  </Label>
                  <Input 
                    id="cust-phone"
                    type="tel"
                    placeholder="Ej: 300 123 4567"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                    className="h-12 rounded-xl bg-muted/20 border-transparent focus-visible:ring-primary/20"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cust-email" className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  <Mail className="h-3 w-3 text-primary" /> Correo Electrónico (Opcional)
                </Label>
                <Input 
                  id="cust-email"
                  type="email"
                  placeholder="tu@correo.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="h-12 rounded-xl bg-muted/20 border-transparent focus-visible:ring-primary/20"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cust-notes" className="flex items-center gap-2 text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                  <MessageSquare className="h-3 w-3 text-primary" /> Notas o requerimientos
                </Label>
                <Textarea 
                  id="cust-notes"
                  placeholder="¿Alguna instrucción especial?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[100px] resize-none rounded-xl bg-muted/20 border-transparent focus-visible:ring-primary/20"
                  disabled={isSubmitting}
                />
              </div>

              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full h-14 text-lg font-black rounded-xl shadow-lg shadow-primary/10 transition-transform active:scale-95"
                  disabled={isSubmitting || !customerName || !customerPhone}
                >
                  {isSubmitting ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Procesando...</>
                  ) : (
                    <><CheckCircle2 className="mr-2 h-5 w-5" /> Confirmar mi cita</>
                  )}
                </Button>
              </div>
           </form>
        </div>
      </div>

      {/* RESUMEN LATERAL */}
      <div className="lg:col-span-1">
        <Card className="rounded-[2rem] border-primary/20 bg-primary/5 shadow-inner overflow-hidden border-2">
          <div className="p-6 space-y-6">
            <h3 className="font-black text-primary text-sm uppercase tracking-widest flex items-center gap-2">
              <Tag className="h-4 w-4" /> Resumen de tu turno
            </h3>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm border border-primary/10"><Tag className="h-5 w-5" /></div>
                <div>
                  <p className="text-[10px] font-bold text-primary/60 uppercase">Servicio</p>
                  <p className="font-bold text-gray-900">{bookingData?.serviceName || 'Cargando...'}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm border border-primary/10"><User className="h-5 w-5" /></div>
                <div>
                  <p className="text-[10px] font-bold text-primary/60 uppercase">Profesional</p>
                  <p className="font-bold text-gray-900">{bookingData?.staffName || 'Cualquier Profesional'}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm border border-primary/10"><Calendar className="h-5 w-5" /></div>
                <div>
                  <p className="text-[10px] font-bold text-primary/60 uppercase">Fecha y Hora</p>
                  <p className="font-bold text-gray-900 capitalize">
                    {bookingData?.date ? formatReservationDate(bookingData.date) : '---'}
                    <span className="mx-1.5 opacity-30">•</span>
                    {bookingData?.startTime || '---'}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-primary/10">
               <div className="flex justify-between items-baseline">
                  <span className="text-xs font-bold text-primary/60 uppercase">Total a pagar</span>
                  <span className="text-2xl font-black text-primary">{formatCurrency(bookingData?.price || 0)}</span>
               </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
