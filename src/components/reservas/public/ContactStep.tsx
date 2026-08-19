'use client';

import React from 'react';
import { CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Phone, Mail, FileText, ArrowLeft, CheckCircle2, Loader2, Sparkles, CalendarClock } from "lucide-react";

export function ContactStep({ data, onUpdate, onConfirm, onBack, isSubmitting, formatDate }: any) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardHeader className="p-8 text-center bg-primary/5 border-b relative">
        <Button variant="ghost" size="icon" onClick={onBack} className="absolute left-6 top-8 rounded-full" disabled={isSubmitting}><ArrowLeft className="h-5 w-5" /></Button>
        <CardTitle className="text-3xl font-black tracking-tight text-gray-900">Tus Datos de Contacto</CardTitle>
        <CardDescription className="text-base font-medium">Completa la información para confirmar tu cita de inmediato.</CardDescription>
      </CardHeader>
      
      <div className="grid grid-cols-1 lg:grid-cols-5">
        <CardContent className="lg:col-span-3 p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 font-bold text-xs uppercase text-muted-foreground"><User className="h-3 w-3" /> Nombre Completo *</Label>
                    <Input placeholder="Ej: Juan Pérez" value={data.customerName} onChange={(e) => onUpdate({ customerName: e.target.value })} disabled={isSubmitting} />
                </div>
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 font-bold text-xs uppercase text-muted-foreground"><Phone className="h-3 w-3" /> WhatsApp *</Label>
                    <Input placeholder="Ej: 300 123 4567" value={data.customerPhone} onChange={(e) => onUpdate({ customerPhone: e.target.value })} disabled={isSubmitting} />
                </div>
            </div>
            <div className="space-y-2">
                <Label className="flex items-center gap-2 font-bold text-xs uppercase text-muted-foreground"><Mail className="h-3 w-3" /> Correo Electrónico</Label>
                <Input type="email" placeholder="tu@correo.com" value={data.customerEmail} onChange={(e) => onUpdate({ customerEmail: e.target.value })} disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
                <Label className="flex items-center gap-2 font-bold text-xs uppercase text-muted-foreground"><FileText className="h-3 w-3" /> Notas adicionales</Label>
                <Textarea placeholder="Indica cualquier requerimiento especial..." value={data.notes} onChange={(e) => onUpdate({ notes: e.target.value })} className="h-32 resize-none" disabled={isSubmitting} />
            </div>
        </CardContent>

        {/* Resumen Lateral */}
        <aside className="lg:col-span-2 bg-muted/20 p-8 border-l space-y-6">
            <h4 className="font-black text-sm uppercase tracking-widest text-muted-foreground">Resumen de tu Turno</h4>
            
            <div className="space-y-4">
                <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center border text-primary shadow-sm shrink-0"><Sparkles className="h-5 w-5" /></div>
                    <div className="flex flex-col"><span className="text-[10px] font-bold text-muted-foreground uppercase">Servicio</span><span className="font-black text-gray-900 leading-tight">{data.serviceName}</span></div>
                </div>

                <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center border text-primary shadow-sm shrink-0"><CalendarClock className="h-5 w-5" /></div>
                    <div className="flex flex-col"><span className="text-[10px] font-bold text-muted-foreground uppercase">Fecha y Hora</span><span className="font-black text-gray-900 leading-tight">{formatDate(data.date)} • {data.startTime}</span></div>
                </div>

                <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center border text-primary shadow-sm shrink-0"><User className="h-5 w-5" /></div>
                    <div className="flex flex-col"><span className="text-[10px] font-bold text-muted-foreground uppercase">Especialista</span><span className="font-black text-gray-900 leading-tight">{data.staffName}</span></div>
                </div>
            </div>

            <div className="pt-6 border-t border-dashed border-muted-foreground/30">
                <div className="flex justify-between items-center text-xl font-black text-primary">
                    <span>Total</span>
                    <span>${Number(data.price).toLocaleString('es-CO')}</span>
                </div>
            </div>

            <Button 
                onClick={onConfirm} 
                disabled={isSubmitting || !data.customerName || !data.customerPhone} 
                className="w-full h-14 text-lg font-black rounded-2xl shadow-xl shadow-primary/10 mt-6 bg-primary hover:bg-primary/90"
            >
                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                Confirmar mi cita
            </Button>
        </aside>
      </div>
    </div>
  );
}
