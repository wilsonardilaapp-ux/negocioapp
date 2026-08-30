'use client';

import React from 'react';
import { AgendaGrid } from '@/components/reservas/AgendaGrid';

/**
 * @fileOverview Página principal de la Agenda de Reservas.
 * Header y Tabs manejados por el layout.
 */
export default function AgendaPage() {
  return (
    <div className="animate-in slide-in-from-bottom-2 duration-500">
      <AgendaGrid />
    </div>
  );
}
