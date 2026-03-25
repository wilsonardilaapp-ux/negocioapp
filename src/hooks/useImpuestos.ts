'use client';
import { useState, useCallback } from 'react';
import type { Impuesto, DeclaracionImpuesto, TipoImpuesto } from '@/types/contabilidad.types';

const getInitialImpuestos = (): Impuesto[] => [
    { id: 'imp-01', nombre: 'IVA 19% Compras', tipo: 'IVA', tasa: 19, cuentaContableCompras: '240801', cuentaContableVentas: 'N/A', activo: true },
    { id: 'imp-02', nombre: 'IVA 19% Ventas', tipo: 'IVA', tasa: 19, cuentaContableCompras: 'N/A', cuentaContableVentas: '240802', activo: true },
    { id: 'imp-03', nombre: 'Retefuente Compras 2.5%', tipo: 'Retefuente', tasa: 2.5, cuentaContableCompras: '236540', cuentaContableVentas: 'N/A', activo: true },
    { id: 'imp-04', nombre: 'Retefuente Ventas 2.5%', tipo: 'Retefuente', tasa: 2.5, cuentaContableCompras: 'N/A', cuentaContableVentas: '135515', activo: true },
    { id: 'imp-05', nombre: 'Impoconsumo 8%', tipo: 'Consumo', tasa: 8, cuentaContableCompras: 'N/A', cuentaContableVentas: '2424', activo: false },
];

const getInitialDeclaraciones = (): DeclaracionImpuesto[] => [
    { id: 'dec-01', periodo: '2023-09', impuestoId: 'imp-02', baseGravable: 25000000, valorCalculado: 4750000, valorPagado: 4750000, fechaPresentacion: '2023-10-15' },
    { id: 'dec-02', periodo: '2023-09', impuestoId: 'imp-03', baseGravable: 18000000, valorCalculado: 450000, valorPagado: 450000, fechaPresentacion: '2023-10-15' },
];

export function useImpuestos() {
    const [impuestos, setImpuestos] = useState<Impuesto[]>(getInitialImpuestos);
    const [declaraciones, setDeclaraciones] = useState<DeclaracionImpuesto[]>(getInitialDeclaraciones);

    const actualizarImpuesto = useCallback((id: string, data: Partial<Omit<Impuesto, 'id'>>) => {
        setImpuestos(prev => prev.map(imp => imp.id === id ? { ...imp, ...data } : imp));
    }, []);

    const registrarDeclaracion = useCallback((data: Omit<DeclaracionImpuesto, 'id'>) => {
        const nuevaDeclaracion: DeclaracionImpuesto = {
            id: `dec-${Date.now()}`,
            ...data
        };
        setDeclaraciones(prev => [nuevaDeclaracion, ...prev]);
    }, []);

    return {
        impuestos,
        declaraciones,
        actualizarImpuesto,
        registrarDeclaracion,
    };
}
