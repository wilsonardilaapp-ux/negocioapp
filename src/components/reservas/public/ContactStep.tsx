'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
    Loader2
} from 'lucide-react';
import type { BookingService, BookingStaff, Reservation } from '@/models/booking';
import { formatReservationDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ContactStepProps {
  bookingData: Partial<Reservation>;
  selectedService: BookingService | null;
  selectedStaff: BookingStaff | null;
  onConfirm: (data: any) => Promise<void>;
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
  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(form);
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <Card className="rounded-[2rem] border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="p-8 pb-4 bg-primary/5 border-b">
             <CardTitle className="text-2xl font-black">Tus Datos de Contacto</CardTitle>
             <CardDescription className="text-sm font-medium">Completa la información para que podamos confirmar tu cita.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="p-8 space-y-6">
               <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="customerName" className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                            <User className="h-3 w-3" /> Nombre Completo *
                        </Label>
                        <Input 
                            id="customerName" 
                            required 
                            value={form.customerName}
                            onChange={(e) => setForm({...form, customerName: e.target.value})}
                            className="h-12 bg-muted/20 border-none focus-visible:ring-primary/20 rounded-xl" 
                            placeholder="Ej: Juan Pérez"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="customerPhone" className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                            <Phone className="h-3 w-3" /> WhatsApp *
                        </Label>
                        <Input 
                            id="customerPhone" 
                            type="tel" 
                            required 
                            value={form.customerPhone}
                            onChange={(e) => setForm({...form, customerPhone: e.target.value})}
                            className="h-12 bg-muted/20 border-none focus-visible:ring-primary/20 rounded-xl"
                            placeholder="300 123 4567"
                        />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="customerEmail" className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                        <Mail className="h-3 w-3" /> Correo Electrónico
                    </Label>
                    <Input 
                        id="customerEmail" 
                        type="email" 
                        value={form.customerEmail}
                        onChange={(e) => setForm({...form, customerEmail: e.target.value})}
                        className="h-12 bg-muted/20 border-none focus-visible:ring-primary/20 rounded-xl"
                        placeholder="tu@correo.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                        <FileText className="h-3 w-3" /> Notas adicionales
                    </Label>
                    <Textarea 
                        id="notes" 
                        value={form.notes}
                        onChange={(e) => setForm({...form, notes: e.target.value})}
                        className="min-h-[100px] bg-muted/20 border-none focus-visible:ring-primary/20 rounded-xl resize-none"
                        placeholder="Cualquier detalle que debamos saber..."
                    />
                  </div>
               </div>
            </CardContent>
            <CardFooter className="p-8 bg-muted/20 border-t flex justify-between items-center">
                <Button type="button" variant="ghost" onClick={onBack} disabled={isSubmitting} className="font-bold gap-2">
                    <ArrowLeft className="h-4 w-4" /> Volver
                </Button>
                <Button type="submit" disabled={isSubmitting} className="h-12 px-8 font-black rounded-xl shadow-lg shadow-primary/20 gap-2">
                    {isSubmitting ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</>
                    ) : (
                        <><Check className="h-4 w-4" /> Confirmar mi cita</>
                    )}
                </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="rounded-[2rem] border-2 border-primary/10 shadow-lg bg-white overflow-hidden sticky top-24">
            <CardHeader className="bg-primary/5 pb-4">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Resumen de tu Cita</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="space-y-4">
                    <div className="space-y-1">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Servicio</span>
                        <div className="flex flex-col">
                            <p className="font-bold text-gray-900 leading-tight">{selectedService?.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-[10px] py-0">{selectedService?.durationMinutes} min</Badge>
                                <span className="text-xs font-black text-primary">{formatCurrency(selectedService?.price || 0)}</span>
                            </div>
                        </div>
                    </div>

                    <Separator className="border-dashed" />

                    <div className="space-y-1">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Profesional</span>
                        <p className="font-bold text-gray-900">{selectedStaff?.name || 'Cualquier Profesional'}</p>
                    </div>

                    <Separator className="border-dashed" />

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Fecha</span>
                            <div className="flex items-center gap-2 font-bold text-xs">
                                <Calendar className="h-3 w-3 text-primary" />
                                {bookingData.date ? formatReservationDate(bookingData.date) : '--'}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Hora</span>
                            <div className="flex items-center gap-2 font-bold text-xs">
                                <Clock className="h-3 w-3 text-primary" />
                                {bookingData.startTime}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <p className="text-[10px] font-medium text-primary leading-tight uppercase tracking-wider">
                        Agendamiento rápido y seguro potenciado por Markix
                    </p>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
