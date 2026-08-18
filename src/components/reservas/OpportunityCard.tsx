'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Smartphone, 
  Calendar, 
  History, 
  Sparkles, 
  Bot,
  ChevronRight,
  Info,
  Clock
} from 'lucide-react';
import type { BookingOpportunity } from '@/services/booking-churn';
import { cn, normalizePhoneNumber } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface Props {
  opportunity: BookingOpportunity;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

export function OpportunityCard({ opportunity }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const riskConfig = {
    critical: { label: 'Alto Riesgo', color: 'bg-red-100 text-red-700 border-red-200' },
    overdue: { label: 'Tarde', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    upcoming: { label: 'Oportunidad', color: 'bg-green-100 text-green-700 border-green-200' },
    normal: { label: 'En tiempo', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  };

  const config = riskConfig[opportunity.riskLevel];

  return (
    <>
      <Card className={cn(
        "overflow-hidden transition-all border-2 group hover:shadow-lg",
        opportunity.riskLevel === 'critical' ? 'border-red-50' : 'border-gray-100'
      )}>
        <CardContent className="p-5 space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-gray-900 line-clamp-1">{opportunity.customerName}</span>
                <span className="text-[10px] font-mono text-muted-foreground">{opportunity.customerPhone}</span>
              </div>
            </div>
            <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-tighter", config.color)}>
              {config.label}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 py-3 border-y border-dashed">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-muted-foreground uppercase">Última Visita</span>
              <p className="text-xs font-black flex items-center gap-1.5">
                <Calendar className="h-3 w-3 text-primary" />
                Hace {opportunity.daysSinceLastVisit} días
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-muted-foreground uppercase">Frecuencia</span>
              <p className="text-xs font-black flex items-center gap-1.5">
                <History className="h-3 w-3 text-primary" />
                Cada {opportunity.averageIntervalDays} días
              </p>
            </div>
          </div>

          <div className="space-y-2">
             <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Último Servicio:</span>
                <span className="font-bold text-gray-800">{opportunity.lastServiceName}</span>
             </div>
             <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Valor Estimado:</span>
                <span className="font-black text-primary">{formatCurrency(opportunity.estimatedValue)}</span>
             </div>
          </div>
        </CardContent>

        <CardFooter className="bg-muted/30 p-3">
          <Button 
            className="w-full h-10 font-black text-xs gap-2 shadow-sm rounded-xl"
            onClick={() => setIsModalOpen(true)}
          >
            <Bot className="h-4 w-4" /> Recuperar Cliente
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <Bot className="h-6 w-6 text-primary" />
              Recuperar a {opportunity.customerName}
            </DialogTitle>
            <DialogDescription className="font-medium">
              Estrategia de re-agendamiento basada en datos históricos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <Card className="bg-primary/5 border-primary/20 shadow-inner">
               <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-xl shadow-sm"><Info className="h-5 w-5 text-primary" /></div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-black uppercase text-gray-500 tracking-widest">Diagnóstico IA</p>
                      <p className="text-sm font-bold text-gray-800">
                        {opportunity.riskLevel === 'critical' 
                          ? 'Riesgo inminente de pérdida definitiva.' 
                          : 'Cerró su ciclo, necesita un recordatorio.'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed italic">
                    "El cliente solía visitarnos cada {opportunity.averageIntervalDays} días, pero ya han pasado {opportunity.daysSinceLastVisit} días. La probabilidad de que agende con la competencia aumenta un 15% cada semana de retraso."
                  </p>
               </CardContent>
            </Card>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Próximos pasos (Fase 10)</Label>
              <div className="p-4 bg-muted/30 rounded-2xl border-2 border-dashed flex items-center justify-center h-24 text-center">
                 <p className="text-xs text-muted-foreground font-medium">
                   En la siguiente fase, aquí podrás generar un mensaje de WhatsApp personalizado con IA para invitar a {opportunity.customerName} a agendar de nuevo.
                 </p>
              </div>
            </div>
          </div>

          <DialogFooter className="bg-muted/20 -mx-6 -mb-6 p-6 border-t">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cerrar</Button>
            <Button asChild className="font-black px-6 gap-2">
                <a 
                  href={`https://wa.me/${normalizePhoneNumber(opportunity.customerPhone)}?text=${encodeURIComponent(`¡Hola ${opportunity.customerName}! 👋 En el equipo de Markix te extrañamos. Hace tiempo que no nos visitas para tu servicio de ${opportunity.lastServiceName}. ¿Te gustaría que te agendemos un espacio esta semana?`)}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Smartphone className="h-4 w-4" /> Enviar Invitación Manual
                </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
