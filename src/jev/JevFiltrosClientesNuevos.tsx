'use client';

import React from 'react';
import { Search, Calendar, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface JevFiltrosClientesNuevosProps {
  busqueda: string;
  onBusquedaChange: (val: string) => void;
  fechaDesde: string;
  onFechaDesdeChange: (val: string) => void;
  fechaHasta: string;
  onFechaHastaChange: (val: string) => void;
  origen: string;
  onOrigenChange: (val: string) => void;
  estado: string;
  onEstadoChange: (val: string) => void;
  onLimpiar: () => void;
  hayFiltrosActivos: boolean;
}

export function JevFiltrosClientesNuevos({
  busqueda,
  onBusquedaChange,
  fechaDesde,
  onFechaDesdeChange,
  fechaHasta,
  onFechaHastaChange,
  origen,
  onOrigenChange,
  estado,
  onEstadoChange,
  onLimpiar,
  hayFiltrosActivos,
}: JevFiltrosClientesNuevosProps) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Buscador */}
        <div className="lg:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, teléfono o email..."
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            className="pl-9 h-9 text-xs border-gray-200 focus-visible:ring-emerald-500"
          />
        </div>

        {/* Origen */}
        <div className="relative">
          <select
            value={origen}
            onChange={(e) => onOrigenChange(e.target.value)}
            className="w-full h-9 text-xs border border-gray-200 rounded-md px-3 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="Todos">Origen: Todos</option>
            <option value="Importado CSV">Importado CSV</option>
            <option value="Manual">Manual</option>
          </select>
        </div>

        {/* Estado Campaña */}
        <div className="relative">
          <select
            value={estado}
            onChange={(e) => onEstadoChange(e.target.value)}
            className="w-full h-9 text-xs border border-gray-200 rounded-md px-3 bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="Todos">Estado: Todos</option>
            <option value="Con campaña enviada">Con campaña enviada</option>
            <option value="Sin campaña enviada">Sin campaña enviada</option>
          </select>
        </div>

        {/* Botón Limpiar */}
        <div className="flex items-center">
          {hayFiltrosActivos ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLimpiar}
              className="text-xs font-bold text-gray-500 hover:text-red-600 gap-1.5 h-9 w-full justify-center"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpiar filtros</span>
            </Button>
          ) : (
            <div className="text-[11px] text-muted-foreground flex items-center gap-1 px-2 text-center w-full justify-center font-medium">
              <Filter className="w-3 h-3 text-emerald-600" />
              Filtros activos: Ninguno
            </div>
          )}
        </div>
      </div>

      {/* Rango de Fechas */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
        <span className="font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          Fecha de Importación:
        </span>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => onFechaDesdeChange(e.target.value)}
            className="h-8 text-xs border border-gray-200 rounded-md px-2 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <span className="text-gray-400">a</span>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => onFechaHastaChange(e.target.value)}
            className="h-8 text-xs border border-gray-200 rounded-md px-2 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>
    </div>
  );
}
