'use client';
import { useState, useMemo } from 'react';
import type { ActivoFijo } from '@/types/contabilidad.types';

const getInitialActivos = (): ActivoFijo[] => {
    const activosData = [
        { id: 'af-001', nombre: 'Computador Portátil Lenovo', codigo: 'COMP-01', fechaAdquisicion: '2022-01-15T00:00:00Z', costoInicial: 4500000, valorResidual: 450000, vidaUtil: 3, cuentaActivo: '152805', cuentaDepreciacion: '159215', cuentaGastoDepreciacion: '516015' },
        { id: 'af-002', nombre: 'Escritorio de Oficina', codigo: 'MUE-01', fechaAdquisicion: '2021-06-20T00:00:00Z', costoInicial: 800000, valorResidual: 80000, vidaUtil: 10, cuentaActivo: '152405', cuentaDepreciacion: '159210', cuentaGastoDepreciacion: '516010' },
        { id: 'af-003', nombre: 'Impresora Multifuncional Epson', codigo: 'IMP-01', fechaAdquisicion: '2023-03-10T00:00:00Z', costoInicial: 1200000, valorResidual: 100000, vidaUtil: 5, cuentaActivo: '152805', cuentaDepreciacion: '159215', cuentaGastoDepreciacion: '516015' },
    ];
    
    // Calculate depreciation and book value
    return activosData.map(activo => {
        const fechaAdquisicion = new Date(activo.fechaAdquisicion);
        const hoy = new Date();
        const mesesTranscurridos = (hoy.getFullYear() - fechaAdquisicion.getFullYear()) * 12 + (hoy.getMonth() - fechaAdquisicion.getMonth());
        const añosTranscurridos = mesesTranscurridos / 12;

        const baseDepreciable = activo.costoInicial - activo.valorResidual;
        const depreciacionAnual = baseDepreciable / activo.vidaUtil;
        let depreciacionAcumulada = depreciacionAnual * añosTranscurridos;

        if (depreciacionAcumulada > baseDepreciable) {
            depreciacionAcumulada = baseDepreciable;
        }

        const valorEnLibros = activo.costoInicial - depreciacionAcumulada;

        return { ...activo, depreciacionAcumulada, valorEnLibros };
    });
};

export function useActivosFijos() {
  const [activos, setActivos] = useState<ActivoFijo[]>(getInitialActivos);

  const totalValorEnLibros = useMemo(() => activos.reduce((sum, activo) => sum + activo.valorEnLibros, 0), [activos]);
  const totalCostoInicial = useMemo(() => activos.reduce((sum, activo) => sum + activo.costoInicial, 0), [activos]);
  const totalDepreciacionAcumulada = useMemo(() => activos.reduce((sum, activo) => sum + activo.depreciacionAcumulada, 0), [activos]);
  
  return {
    activos,
    totalValorEnLibros,
    totalCostoInicial,
    totalDepreciacionAcumulada,
  };
}
