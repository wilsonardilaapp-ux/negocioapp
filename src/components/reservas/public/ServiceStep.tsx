
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, ChevronRight } from 'lucide-react';
import type { BookingService } from '@/models/booking';

interface Props {
  services: BookingService[];
  onSelect: (id: string) => void;
}

export function ServiceStep({ services, onSelect }: Props) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-gray-900">¿Qué servicio necesitas?</h2>
        <p className="text-muted-foreground text-sm">Selecciona el tratamiento o consulta que deseas agendar.</p>
      </div>

      <div className="grid gap-4">
        {services.map((service) => (
          <Card 
            key={service.id} 
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all active:scale-[0.98] group"
            onClick={() => onSelect(service.id)}
          >
            <CardContent className="p-5 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{service.name}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {service.durationMinutes} min
                  </div>
                  <span className="font-black text-primary">{formatCurrency(service.price)}</span>
                </div>
                {service.description && (
                  <p className="text-[11px] text-muted-foreground line-clamp-1 pt-1">{service.description}</p>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
