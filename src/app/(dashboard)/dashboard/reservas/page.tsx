'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ReservasTabs } from '@/components/reservas/ReservasTabs';
import { AgendaGrid } from '@/components/reservas/AgendaGrid';
import { CalendarDays } from 'lucide-react';

/**
 * @fileOverview Página principal de la Agenda de Reservas.
 * Punto de entrada administrativo para la gestión diaria de citas.
 */
export default function AgendaPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <CalendarDays className="h-8 w-8 text-primary" />
            Agenda y Reservas
          </h1>
          <p className="text-muted-foreground">Monitorea y gestiona las citas diarias de tu negocio.</p>
        </div>
      </header>

      <ReservasTabs />

      <AgendaGrid />
    </div>
  );
}
