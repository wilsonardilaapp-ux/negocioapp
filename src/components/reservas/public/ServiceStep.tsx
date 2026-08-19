'use client';

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, DollarSign, ChevronRight, Sparkles } from "lucide-react";
import type { BookingService } from "@/models/booking";

interface ServiceStepProps {
  services: BookingService[];
  onSelect: (service: BookingService) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};

export function ServiceStep({ services, onSelect }: ServiceStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-gray-900">Selecciona un servicio</h2>
        <p className="text-muted-foreground">Elige el tratamiento o consulta que deseas agendar.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {services.map((service) => (
          <Card 
            key={service.id} 
            className="group cursor-pointer hover:border-primary/50 transition-all hover:shadow-md overflow-hidden"
            onClick={() => onSelect(service)}
          >
            <CardContent className="p-0 flex">
              <div className="flex-1 p-6 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg text-gray-900 group-hover:text-primary transition-colors">
                      {service.name}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {service.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-primary block">
                      {formatCurrency(service.price)}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center justify-end gap-1">
                      <Clock className="h-3 w-3" /> {service.durationMinutes} min
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-[10px] font-black uppercase text-green-600 tracking-widest">Disponible hoy</span>
                </div>
              </div>
              <div className="w-12 bg-muted/30 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-all" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default ServiceStep;
