'use client';

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ChevronRight, Tag } from "lucide-react";
import type { BookingService } from "@/models/booking";

interface ServiceStepProps {
  services: BookingService[];
  onSelectService: (service: BookingService) => void;
}

export function ServiceStep({ services, onSelectService }: ServiceStepProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-gray-900">¿Qué servicio necesitas?</h2>
        <p className="text-muted-foreground">Selecciona una de nuestras opciones para agendar tu cita.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
        {services.map((service) => (
          <Card 
            key={service.id} 
            className="group cursor-pointer hover:border-primary/50 transition-all hover:shadow-md overflow-hidden"
            onClick={() => onSelectService(service)}
          >
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <Tag className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg text-gray-900">{service.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {service.durationMinutes} min
                      </span>
                      <span className="font-black text-primary">{formatCurrency(service.price)}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-primary transition-colors" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default ServiceStep;
