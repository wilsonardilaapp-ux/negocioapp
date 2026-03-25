'use client';
import { useState, useMemo, useCallback } from 'react';
import type { MovimientoLibro, MovimientoExtracto, PartidaConciliada } from '@/types/contabilidad.types';
import { useAsientosContables } from './useAsientosContables';

const getInitialExtracto = (): MovimientoExtracto[] => [
    { id: 'ext-001', fecha: '2023-10-01', descripcion: 'Consignación nómina', monto: -1750000, esConciliado: false },
    { id: 'ext-002', fecha: '2023-10-04', descripcion: 'Pago de cliente Juan Pérez', monto: 450000, esConciliado: false },
    { id: 'ext-003', fecha: '2023-10-06', descripcion: 'Comisión bancaria', monto: -15000, esConciliado: false },
    { id: 'ext-004', fecha: '2023-10-10', descripcion: 'Intereses sobre saldo', monto: 2500, esConciliado: false },
];

export function useConciliacion() {
    const { asientos } = useAsientosContables();
    const [extracto, setExtracto] = useState<MovimientoExtracto[]>(getInitialExtracto);
    const [partidasConciliadas, setPartidasConciliadas] = useState<PartidaConciliada[]>([]);

    const movimientosLibro = useMemo((): MovimientoLibro[] => {
        return asientos
            .flatMap(a => a.detalles)
            .filter(d => d.cuentaCodigo.startsWith('1110')) // Solo cuentas de banco
            .map(d => ({
                id: d.id,
                fecha: asientos.find(a => a.detalles.some(det => det.id === d.id))!.fecha,
                descripcion: d.descripcion,
                debito: d.debito,
                credito: d.credito,
                esConciliado: partidasConciliadas.some(pc => pc.movimientoLibroId === d.id)
            }));
    }, [asientos, partidasConciliadas]);

    const conciliarPartida = useCallback((libroId: string, extractoId: string) => {
        setPartidasConciliadas(prev => [...prev, {
            id: `pc-${Date.now()}`,
            movimientoLibroId: libroId,
            movimientoExtractoId: extractoId,
            fechaConciliacion: new Date().toISOString(),
        }]);

        // Marcar el movimiento del extracto como conciliado
        setExtracto(prev => prev.map(mov => 
            mov.id === extractoId ? { ...mov, esConciliado: true } : mov
        ));
    }, []);

    const desconciliarPartida = useCallback((partidaId: string) => {
        const partidaAEliminar = partidasConciliadas.find(p => p.id === partidaId);
        if (!partidaAEliminar) return;

        // Desmarcar el movimiento del extracto
        setExtracto(prev => prev.map(mov => 
            mov.id === partidaAEliminar.movimientoExtractoId ? { ...mov, esConciliado: false } : mov
        ));
        
        setPartidasConciliadas(prev => prev.filter(p => p.id !== partidaId));
    }, [partidasConciliadas]);
    
    return {
        movimientosLibro,
        extractoBancario: extracto,
        partidasConciliadas,
        conciliarPartida,
        desconciliarPartida,
    };
}
