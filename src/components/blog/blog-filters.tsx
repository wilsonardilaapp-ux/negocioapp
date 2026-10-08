'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, RotateCcw } from 'lucide-react';

export interface BlogFilterState {
  search: string;
  status: string; // 'all' | 'active' | 'draft'
  business: string; // 'all' | 'Cliente' | 'Global'
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  sort: string; // 'recent' | 'oldest' | 'title-asc' | 'title-desc'
}

interface BlogFiltersProps {
  filters: BlogFilterState;
  onFilterChange: (filters: BlogFilterState) => void;
  onResetFilters: () => void;
  totalCount: number;
  filteredCount: number;
  businessOptions: string[];
}

export function BlogFilters({
  filters,
  onFilterChange,
  onResetFilters,
  totalCount,
  filteredCount,
  businessOptions,
}: BlogFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);

  // Sincronizar input local con filtros externos (por ejemplo al limpiar)
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  // Debounce de 300 ms en la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        onFilterChange({ ...filters, search: localSearch });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch]);

  const hasActiveFilters =
    filters.search.trim() !== '' ||
    filters.status !== 'all' ||
    filters.business !== 'all' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.sort !== 'recent';

  return (
    <div className="space-y-3 pb-2">
      {/* Fila 1: Búsqueda y Selects de Estado / Negocio / Orden */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Barra de búsqueda con icono */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Controles de Filtro */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Select Estado */}
          <Select
            value={filters.status}
            onValueChange={(val) => onFilterChange({ ...filters, status: val })}
          >
            <SelectTrigger className="h-9 text-xs w-[130px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Estado: Todos</SelectItem>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
            </SelectContent>
          </Select>

          {/* Select Negocio */}
          <Select
            value={filters.business}
            onValueChange={(val) => onFilterChange({ ...filters, business: val })}
          >
            <SelectTrigger className="h-9 text-xs w-[140px]">
              <SelectValue placeholder="Negocio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Negocio: Todos</SelectItem>
              {businessOptions.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Select Orden */}
          <Select
            value={filters.sort}
            onValueChange={(val) => onFilterChange({ ...filters, sort: val })}
          >
            <SelectTrigger className="h-9 text-xs w-[145px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Más recientes</SelectItem>
              <SelectItem value="oldest">Más antiguos</SelectItem>
              <SelectItem value="title-asc">Título A-Z</SelectItem>
              <SelectItem value="title-desc">Título Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Fila 2: Rango de Fechas, Contador y Limpiar Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 border-t border-border/60 text-xs">
        {/* Filtros de Fecha */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground font-medium text-[11px]">Fecha:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-[11px]">Desde:</span>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value })}
              className="h-8 text-xs w-[130px] p-1.5"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-[11px]">Hasta:</span>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value })}
              className="h-8 text-xs w-[130px] p-1.5"
            />
          </div>

          {/* Botón Limpiar filtros */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpiar filtros
            </Button>
          )}
        </div>

        {/* Contador de Resultados */}
        <div className="text-muted-foreground text-[11px] font-medium self-end sm:self-auto">
          Mostrando <strong className="text-foreground">{filteredCount}</strong> de <strong className="text-foreground">{totalCount}</strong> publicaciones
        </div>
      </div>
    </div>
  );
}
