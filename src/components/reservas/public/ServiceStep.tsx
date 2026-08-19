'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Tag, ChevronRight } from 'lucide-react';
import type { BookingService } from '@/models/booking';

interface ServiceStepProps {
  services: BookingService[];
  selectedId?: string;
  onSelect: (service: BookingService) => void;
}

export function ServiceStep({ services, selectedId, onSelect }: ServiceStepProps) {
  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 sm:p-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">Selecciona un servicio</h2>
        <p className="text-sm text-muted-foreground">Elige el tratamiento o consulta que deseas agendar.</p>
      </div>

      <div className="space-y-4">
        {services.map((service) => (
          <div 
            key={service.id}
            onClick={() => onSelect(service)}
            className={`group p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-4 ${
              selectedId === service.id 
                ? 'border-primary bg-primary/5 shadow-md' 
                : 'border-gray-100 hover:border-primary/20 hover:bg-muted/30'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl transition-colors ${
                selectedId === service.id ? 'bg-primary text-white' : 'bg-muted text-gray-400 group-hover:bg-primary/10 group-hover:text-primary'
              }`}>
                <Tag className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{service.name}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                    <Clock className="h-3.5 w-3.5" /> {service.durationMinutes} min
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-black uppercase tracking-widest bg-primary/5 text-primary border-none">
                    ${service.price.toLocaleString('es-CO')}
                  </Badge>
                </div>
              </div>
            </div>
            <ChevronRight className={`h-5 w-5 transition-transform ${selectedId === service.id ? 'text-primary translate-x-1' : 'text-gray-300'}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default ServiceStep;
