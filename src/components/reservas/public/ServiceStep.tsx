'use client';

import React from 'react';
import { CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Clock, ChevronRight } from "lucide-react";
import type { BookingService } from "@/models/booking";
import { cn } from "@/lib/utils";

export function ServiceStep({ services, selection, onSelect }: { services: BookingService[], selection: string, onSelect: (s: BookingService) => void }) {
  const formatCurrency = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <CardHeader className="p-8 text-center bg-primary/5 border-b">
        <CardTitle className="text-3xl font-black tracking-tight text-gray-900">¿Qué servicio necesitas?</CardTitle>
        <CardDescription className="text-base font-medium">Selecciona el tratamiento o consulta que deseas agendar.</CardDescription>
      </CardHeader>
      <CardContent className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className={cn(
                "group flex flex-col items-start p-6 rounded-3xl border-2 transition-all text-left",
                selection === s.id ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-muted hover:border-primary/30 hover:bg-muted/30"
              )}
            >
              <div className="flex justify-between w-full mb-4">
                <div className="p-2 bg-primary/10 rounded-xl text-primary"><Sparkles className="h-5 w-5" /></div>
                <div className="h-8 w-8 rounded-full border flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors"><ChevronRight className="h-4 w-4" /></div>
              </div>
              <h3 className="font-black text-xl text-gray-900 mb-1">{s.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{s.description}</p>
              <div className="flex items-center gap-4 mt-auto">
                <Badge variant="secondary" className="gap-1 px-3 py-1 font-bold"><Clock className="h-3 w-3" /> {s.durationMinutes} min</Badge>
                <span className="font-black text-primary">{formatCurrency(s.price)}</span>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </div>
  );
}
