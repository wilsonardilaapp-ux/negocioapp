'use client';
import { useState, useCallback } from 'react';
import { usePlanDeCuentas } from './usePlanDeCuentas';
import { useAsientosContables } from './useAsientosContables';
import type { ReporteContable, TipoReporte, Cuenta } from '@/types/contabilidad.types';

export function useReportesContables() {
  const { cuentas } = usePlanDeCuentas();
  const { asientos } = useAsientosContables();
  const [reporteActual, setReporteActual] = useState<ReporteContable | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generarBalanceGeneral = useCallback((cuentas: Cuenta[], fin: Date): ReporteContable => {
    const activos = cuentas.filter(c => c.tipo === 'Activo' && !c.esCuentaMayor).reduce((sum, c) => sum + c.saldo, 0);
    const pasivos = cuentas.filter(c => c.tipo === 'Pasivo' && !c.esCuentaMayor).reduce((sum, c) => sum + c.saldo, 0);
    const patrimonio = cuentas.filter(c => c.tipo === 'Patrimonio' && !c.esCuentaMayor).reduce((sum, c) => sum + c.saldo, 0);

    return {
      tipo: 'balance_general',
      fechaGeneracion: new Date().toISOString(),
      rangoFechas: { inicio: '', fin: fin.toISOString() },
      datos: [
        { categoria: 'Activos', cuentas: cuentas.filter(c => c.tipo === 'Activo' && c.permiteMovimientos), total: activos },
        { categoria: 'Pasivos', cuentas: cuentas.filter(c => c.tipo === 'Pasivo' && c.permiteMovimientos), total: pasivos },
        { categoria: 'Patrimonio', cuentas: cuentas.filter(c => c.tipo === 'Patrimonio' && c.permiteMovimientos), total: patrimonio },
      ],
      totales: {
        totalActivos: activos,
        totalPasivoPatrimonio: pasivos + patrimonio,
      }
    };
  }, []);

  const generarEstadoResultados = useCallback((cuentas: Cuenta[], inicio: Date, fin: Date): ReporteContable => {
    // This is a simplified version. A real one would use asientos within the date range.
    const ingresos = cuentas.filter(c => c.tipo === 'Ingresos' && !c.esCuentaMayor).reduce((sum, c) => sum + c.saldo, 0);
    const costos = cuentas.filter(c => c.tipo === 'Costos' && !c.esCuentaMayor).reduce((sum, c) => sum + c.saldo, 0);
    const gastos = cuentas.filter(c => c.tipo === 'Gastos' && !c.esCuentaMayor).reduce((sum, c) => sum + c.saldo, 0);
    const utilidadBruta = ingresos - costos;
    const utilidadNeta = utilidadBruta - gastos;
    
    return {
      tipo: 'estado_resultados',
      fechaGeneracion: new Date().toISOString(),
      rangoFechas: { inicio: inicio.toISOString(), fin: fin.toISOString() },
      datos: [
        { concepto: 'Ingresos Operacionales', valor: ingresos },
        { concepto: 'Costo de Ventas', valor: -costos },
        { concepto: 'Gastos Operacionales', valor: -gastos },
      ],
      totales: {
        utilidadBruta,
        utilidadNeta
      }
    };
  }, []);

  const generarReporte = useCallback((tipo: TipoReporte, fechaInicio: string, fechaFin: string) => {
    setIsLoading(true);
    // Simulate async generation
    setTimeout(() => {
        let reporte: ReporteContable;
        const fin = new Date(fechaFin);
        const inicio = new Date(fechaInicio);

        if (tipo === 'balance_general') {
            reporte = generarBalanceGeneral(cuentas, fin);
        } else {
            reporte = generarEstadoResultados(cuentas, inicio, fin);
        }
        setReporteActual(reporte);
        setIsLoading(false);
    }, 500);

  }, [cuentas, generarBalanceGeneral, generarEstadoResultados]);

  return {
    reporteActual,
    generarReporte,
    isLoading,
  };
}
