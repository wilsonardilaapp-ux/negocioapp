'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Mail, Phone, FileText, Calendar, Clock, ArrowLeft, Check, Sparkles, ShieldCheck } from "lucide-react";
import { cn, formatReservationDate } from "@/lib/utils";
import { Loader2 } from 'lucide-react';

interface ContactStepProps {
  bookingData: any;
  onBack: () => void;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting: boolean;
}

export function ContactStep({ bookingData = {}, onBack, onSubmit, isSubmitting }: ContactStepProps) {
  const [formData, setFormData] = useState({
    customerName: bookingData?.customerName || '',
    customerPhone: bookingData?.customerPhone || '',
    customerEmail: bookingData?.customerEmail || '',
    notes: bookingData?.notes || '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.customerPhone) return;
    onSubmit(formData);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start max-w-5xl mx-auto">
      <div className="lg:col-span-2 space-y-6">
        <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
          <CardHeader className="p-8 pb-4">
             <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full h-10 w-10"><ArrowLeft className="h-5 w-5"/></Button>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1.5 px-3 py-1">
                    <ShieldCheck className="h-3 w-3" /> Pago Seguro
                </Badge>
             </div>
             <div className="mt-4">
                <CardTitle className="text-3xl font-black tracking-tight text-gray-900">Tus datos de contacto</CardTitle>
                <CardDescription className="text-base font-medium">Completa la información para confirmar tu espacio.</CardDescription>
             </div>
          </CardHeader>
          <form onSubmit={handleFormSubmit}>
            <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                            <User className="h-3 w-3 text-primary" /> Nombre Completo
                        </Label>
                        <Input 
                            required 
                            placeholder="Ej: Juan Pérez"
                            value={formData.customerName}
                            onChange={(e) => handleInputChange('customerName', e.target.value)}
                            className="h-12 bg-muted/20 border-none focus-visible:ring-primary/20 rounded-xl" 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                            <Phone className="h-3 w-3 text-primary" /> WhatsApp / Celular
                        </Label>
                        <Input 
                            required 
                            placeholder="300 123 4567"
                            value={formData.customerPhone}
                            onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                            className="h-12 bg-muted/20 border-none focus-visible:ring-primary/20 rounded-xl" 
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                        <Mail className="h-3 w-3 text-primary" /> Correo Electrónico (Opcional)
                    </Label>
                    <Input 
                        type="email"
                        placeholder="tu@correo.com"
                        value={formData.customerEmail}
                        onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                        className="h-12 bg-muted/20 border-none focus-visible:ring-primary/20 rounded-xl" 
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                        <FileText className="h-3 w-3 text-primary" /> Notas o Requerimientos
                    </Label>
                    <Textarea 
                        placeholder="¿Algo que debamos saber antes de tu cita?"
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        className="min-h-[100px] bg-muted/20 border-none focus-visible:ring-primary/20 rounded-xl resize-none" 
                    />
                </div>
            </CardContent>
            <CardFooter className="p-8 bg-muted/10 border-t flex justify-end">
                <Button 
                    type="submit" 
                    disabled={isSubmitting || !formData.customerName || !formData.customerPhone} 
                    className="h-14 px-10 text-lg font-black rounded-2xl shadow-2xl shadow-primary/20 group"
                >
                    {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Check className="mr-2 h-5 w-5 group-hover:scale-125 transition-transform" />}
                    Confirmar mi cita
                </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="rounded-[2.5rem] border-primary/20 bg-primary/5 shadow-inner border-2 overflow-hidden sticky top-24">
            <CardHeader className="pb-4">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Resumen de tu turno</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-start gap-4">
                    <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm shrink-0 border border-primary/10">
                        <Sparkles className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-primary/70 tracking-widest">Servicio</p>
                        <p className="font-bold text-gray-900 leading-tight">{bookingData?.serviceId || 'N/A'}</p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm shrink-0 border border-primary/10">
                        <Calendar className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-primary/70 tracking-widest">Fecha y Hora</p>
                        <div className="flex items-center gap-1 font-bold text-gray-900 leading-tight">
                            <span>{bookingData?.date ? formatReservationDate(bookingData.date) : '---'}</span>
                            <span className="text-primary/40">•</span>
                            <span className="text-primary">{bookingData?.startTime || '---'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-primary shadow-sm shrink-0 border border-primary/10">
                        <User className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-primary/70 tracking-widest">Profesional</p>
                        <p className="font-bold text-gray-900 leading-tight">{bookingData?.staffName || 'Asignación automática'}</p>
                    </div>
                </div>

                <div className="pt-6 border-t border-primary/10 flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-widest text-primary/60">Total a pagar</span>
                    <span className="text-2xl font-black text-primary">${(bookingData?.price || 0).toLocaleString('es-CO')}</span>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ContactStep;
