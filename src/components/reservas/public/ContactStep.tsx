'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
} from 'lucide-react';
import { cn, formatReservationDate } from '@/lib/utils';
import type { BookingService, BookingStaff } from '@/models/booking';

interface ContactStepProps {
  bookingData: any;
  onBack: () => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  selectedService: BookingService | null;
  selectedStaff: BookingStaff | null;
}

export function ContactStep({ 
  bookingData = {}, 
  onBack, 
  onSubmit, 
  isSubmitting,
  selectedService,
  selectedStaff
}: ContactStepProps) {
  const [formData, setFormData] = useState({
    customerName: bookingData?.customerName || '',
    customerPhone: bookingData?.customerPhone || '',
    customerEmail: bookingData?.customerEmail || '',
    notes: bookingData?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.customerName.trim()) newErrors.customerName = "El nombre es obligatorio.";
    if (!formData.customerPhone.trim()) newErrors.customerPhone = "El WhatsApp es obligatorio.";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start max-w-5xl mx-auto">
      {/* Formulario de Contacto */}
      <Card className="lg:col-span-2 rounded-[2rem] border-gray-100 shadow-sm overflow-hidden">
        <CardHeader className="p-8 pb-4 bg-muted/20 border-b">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-full hover:bg-white text-gray-500 hover:text-gray-900 transition-colors"
              aria-label="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black">Finaliza tu Reserva</CardTitle>
              <CardDescription>Completa tus datos para enviarte la confirmación.</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <form onSubmit={handleFormSubmit}>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerName" className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <User className="h-3 w-3" /> Nombre Completo *
                </Label>
                <Input 
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                  placeholder="Ej: Juan Pérez"
                  className="h-12 rounded-xl bg-muted/10 border-2 focus-visible:ring-primary/20"
                />
                {errors.customerName && <p className="text-xs text-red-500 font-bold">{errors.customerName}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerPhone" className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Phone className="h-3 w-3" /> WhatsApp *
                  </Label>
                  <Input 
                    id="customerPhone"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                    placeholder="300 123 4567"
                    className="h-12 rounded-xl bg-muted/10 border-2 focus-visible:ring-primary/20"
                  />
                  {errors.customerPhone && <p className="text-xs text-red-500 font-bold">{errors.customerPhone}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerEmail" className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Mail className="h-3 w-3" /> Correo (Opcional)
                  </Label>
                  <Input 
                    id="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                    placeholder="tu@correo.com"
                    className="h-12 rounded-xl bg-muted/10 border-2 focus-visible:ring-primary/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <FileText className="h-3 w-3" /> Notas Adicionales
                </Label>
                <Textarea 
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="¿Alguna instrucción especial para nosotros?"
                  className="min-h-[100px] rounded-xl bg-muted/10 border-2 focus-visible:ring-primary/20 resize-none"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="p-8 pt-0">
            <Button 
              type="submit" 
              className="w-full h-14 text-lg font-black shadow-xl shadow-primary/10 rounded-2xl gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
              Confirmar mi cita
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Resumen Lateral */}
      <Card className="rounded-[2rem] border-2 border-primary/10 shadow-sm overflow-hidden bg-white sticky top-24">
        <CardHeader className="bg-primary/5 border-b pb-4">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
            <Sparkles className="h-4 w-4 fill-primary" />
            Resumen del Turno
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
           <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Servicio</span>
                <p className="font-black text-gray-900 leading-tight">{selectedService?.name}</p>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Profesional</span>
                <p className="font-bold text-gray-700">{selectedStaff?.name || 'Cualquier Profesional'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-dashed border-gray-100">
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-primary" />
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Fecha</span>
                    </div>
                    <p className="font-bold text-xs">{bookingData?.date ? formatReservationDate(bookingData.date) : '--'}</p>
                </div>
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-primary" />
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Hora</span>
                    </div>
                    <p className="font-bold text-xs">{bookingData?.startTime || '--'}</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                 <span className="text-xs font-bold text-gray-900 uppercase">Total a pagar</span>
                 <span className="text-xl font-black text-primary">{selectedService ? formatCurrency(selectedService.price) : '--'}</span>
              </div>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ContactStep;
