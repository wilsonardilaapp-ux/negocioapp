'use client';

import { useState, useCallback } from 'react';
import type { AsientoContable } from '@/types/contabilidad.types';

const getInitialAsientos = (): AsientoContable[] => [
  {
    id: 'asiento-001',
    fecha: '2023-10-01T10:00:00Z',
    concepto: 'Compra de inventario de oficina',
    documentoReferencia: 'FC-1020',
    totalDebitos: 1750000,
    totalCreditos: 1750000,
    estaCuadrado: true,
    detalles: [
      { id: 'd-001', cuentaCodigo: '143501', cuentaNombre: 'Mercancías no fab. por la emp.', descripcion: 'Compra de resmas de papel', debito: 1750000, credito: 0 },
      { id: 'd-002', cuentaCodigo: '111005', cuentaNombre: 'Bancos Nacionales', descripcion: 'Pago factura FC-1020', debito: 0, credito: 1750000 },
    ]
  },
  {
    id: 'asiento-002',
    fecha: '2023-10-05T14:00:00Z',
    concepto: 'Venta de mercancía a crédito',
    documentoReferencia: 'FV-501',
    totalDebitos: 450000,
    totalCreditos: 450000,
    estaCuadrado: true,
    detalles: [
      { id: 'd-003', cuentaCodigo: '130505', cuentaNombre: 'Clientes Nacionales', descripcion: 'Venta a crédito FV-501', debito: 450000, credito: 0 },
      { id: 'd-004', cuentaCodigo: '4135', cuentaNombre: 'Comercio al por mayor y al por menor', descripcion: 'Ingreso por venta FV-501', debito: 0, credito: 450000 },
    ]
  },
];

export function useAsientosContables() {
  const [asientos, setAsientos] = useState<AsientoContable[]>(getInitialAsientos);

  const registrarAsiento = useCallback((nuevoAsientoData: Omit<AsientoContable, 'id' | 'totalDebitos' | 'totalCreditos' | 'estaCuadrado'>) => {
    const totalDebitos = nuevoAsientoData.detalles.reduce((sum, d) => sum + d.debito, 0);
    const totalCreditos = nuevoAsientoData.detalles.reduce((sum, d) => sum + d.credito, 0);
    const estaCuadrado = Math.abs(totalDebitos - totalCreditos) < 0.01;

    const nuevoAsiento: AsientoContable = {
      id: `asiento-${Date.now()}`,
      ...nuevoAsientoData,
      totalDebitos,
      totalCreditos,
      estaCuadrado,
    };

    setAsientos(prev => [nuevoAsiento, ...prev]);

  }, []);

  return {
    asientos,
    registrarAsiento,
  };
}
