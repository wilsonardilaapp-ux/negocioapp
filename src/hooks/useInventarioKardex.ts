
'use client';

import { useState, useMemo, useCallback } from 'react';
import type {
  Producto,
  MovimientoKardex,
  ConfiguracionKardex,
  ResumenInventario,
  NuevoMovimientoForm,
  MetodoValuacion,
  LineaKardex,
  EstadoStock,
  TipoMovimiento
} from '@/types/inventario.types';

// --- DATOS DE EJEMPLO ---
const getInitialMockData = () => {
    const productos: Producto[] = [
        { id: 'prod-001', codigo: 'P001', nombre: 'Resma de Papel Carta', categoria: 'Oficina', stockActual: 150, stockMinimo: 50, stockMaximo: 200, costoUnitario: 18000, cuentaContable: '143501', bodega: 'Principal', estado: 'normal' },
        { id: 'prod-002', codigo: 'P002', nombre: 'Toner para Impresora HP', categoria: 'Tecnología', stockActual: 20, stockMinimo: 10, stockMaximo: 30, costoUnitario: 250000, cuentaContable: '143502', bodega: 'Principal', estado: 'normal' },
        { id: 'prod-003', codigo: 'P003', nombre: 'Caja de Lápices HB', categoria: 'Oficina', stockActual: 8, stockMinimo: 20, stockMaximo: 100, costoUnitario: 12000, cuentaContable: '143501', bodega: 'Principal', estado: 'bajo' },
        { id: 'prod-004', codigo: 'P004', nombre: 'Silla Ergonómica', categoria: 'Mobiliario', stockActual: 30, stockMinimo: 5, stockMaximo: 25, costoUnitario: 450000, cuentaContable: '143503', bodega: 'Principal', estado: 'sobre_stock' },
        { id: 'prod-005', codigo: 'P005', nombre: 'Café en grano 1kg', categoria: 'Cafetería', stockActual: 0, stockMinimo: 15, stockMaximo: 50, costoUnitario: 45000, cuentaContable: '143504', bodega: 'Principal', estado: 'agotado' },
        { id: 'prod-006', codigo: 'P006', nombre: 'Limpiador Multiusos 1L', categoria: 'Aseo', stockActual: 40, stockMinimo: 20, stockMaximo: 60, costoUnitario: 8000, cuentaContable: '143505', bodega: 'Principal', estado: 'normal' }
    ];

    const movimientos: MovimientoKardex[] = [
        // Producto 1
        { id: 'mov-001', fecha: '2023-10-01T10:00:00Z', tipo: 'entrada_compra', productoId: 'prod-001', documento: 'FC-1020', cantidad: 100, costoUnitario: 17500, costoTotal: 1750000, saldoCantidad: 100, saldoTotal: 1750000 },
        { id: 'mov-002', fecha: '2023-10-05T14:00:00Z', tipo: 'salida_venta', productoId: 'prod-001', documento: 'FV-501', cantidad: 20, costoUnitario: 17500, costoTotal: 350000, saldoCantidad: 80, saldoTotal: 1400000 },
        { id: 'mov-003', fecha: '2023-10-10T11:00:00Z', tipo: 'entrada_compra', productoId: 'prod-001', documento: 'FC-1055', cantidad: 100, costoUnitario: 18000, costoTotal: 1800000, saldoCantidad: 180, saldoTotal: 3200000 },
        { id: 'mov-004', fecha: '2023-10-15T09:30:00Z', tipo: 'salida_venta', productoId: 'prod-001', documento: 'FV-520', cantidad: 30, costoUnitario: 17777.78, costoTotal: 533333.34, saldoCantidad: 150, saldoTotal: 2666666.66 },
        // Producto 2
        { id: 'mov-005', fecha: '2023-10-02T09:00:00Z', tipo: 'entrada_compra', productoId: 'prod-002', documento: 'FC-1022', cantidad: 25, costoUnitario: 245000, costoTotal: 6125000, saldoCantidad: 25, saldoTotal: 6125000 },
        { id: 'mov-006', fecha: '2023-10-08T16:00:00Z', tipo: 'salida_venta', productoId: 'prod-002', documento: 'FV-515', cantidad: 5, costoUnitario: 245000, costoTotal: 1225000, saldoCantidad: 20, saldoTotal: 4900000 },
        // Producto 3
        { id: 'mov-007', fecha: '2023-10-03T13:00:00Z', tipo: 'entrada_compra', productoId: 'prod-003', documento: 'FC-1030', cantidad: 50, costoUnitario: 11500, costoTotal: 575000, saldoCantidad: 50, saldoTotal: 575000 },
        { id: 'mov-008', fecha: '2023-10-12T10:00:00Z', tipo: 'salida_venta', productoId: 'prod-003', documento: 'FV-518', cantidad: 42, costoUnitario: 11500, costoTotal: 483000, saldoCantidad: 8, saldoTotal: 92000 }
    ];

    return { productos, movimientos };
}

export function useInventarioKardex() {
  const [productos, setProductos] = useState<Producto[]>(() => getInitialMockData().productos);
  const [movimientos, setMovimientos] = useState<MovimientoKardex[]>(() => getInitialMockData().movimientos);
  const [configuracion, setConfiguracion] = useState<ConfiguracionKardex>({
    metodoValuacion: 'promedio',
    generarAsientoAutomatico: false,
    cuentaInventario: '143501',
    cuentaCostoVentas: '613501',
    alertasStockMinimo: true,
  });

  const registrarMovimiento = useCallback((nuevoMovimiento: NuevoMovimientoForm) => {
    setMovimientos(prev => {
      const producto = productos.find(p => p.id === nuevoMovimiento.productoId);
      if (!producto) return prev;

      const ultimoMovimiento = [...prev]
        .filter(m => m.productoId === nuevoMovimiento.productoId)
        .pop();
      
      const saldoCantidadAnterior = ultimoMovimiento?.saldoCantidad ?? 0;
      const saldoTotalAnterior = ultimoMovimiento?.saldoTotal ?? 0;

      let nuevoSaldoCantidad = saldoCantidadAnterior;
      let nuevoSaldoTotal = saldoTotalAnterior;

      const costoTotalMovimiento = nuevoMovimiento.cantidad * nuevoMovimiento.costoUnitario;

      if (nuevoMovimiento.tipo.startsWith('entrada')) {
        nuevoSaldoCantidad += nuevoMovimiento.cantidad;
        nuevoSaldoTotal += costoTotalMovimiento;
      } else {
        nuevoSaldoCantidad -= nuevoMovimiento.cantidad;
        // La valoración de la salida depende del método, aquí simplificamos con el costo del movimiento
        const costoSalida = costoTotalMovimiento; // En un caso real, esto se calcularía
        nuevoSaldoTotal -= costoSalida;
      }

      const movimientoCompleto: MovimientoKardex = {
        id: `mov-${Date.now()}`,
        ...nuevoMovimiento,
        costoTotal: costoTotalMovimiento,
        saldoCantidad: nuevoSaldoCantidad,
        saldoTotal: nuevoSaldoTotal,
      };

      // Actualizar el stock del producto
      setProductos(prods => prods.map(p => {
        if (p.id === nuevoMovimiento.productoId) {
          let estado: EstadoStock = 'normal';
          if (nuevoSaldoCantidad <= 0) estado = 'agotado';
          else if (nuevoSaldoCantidad <= p.stockMinimo) estado = 'bajo';
          else if (nuevoSaldoCantidad > p.stockMaximo) estado = 'sobre_stock';
          return { ...p, stockActual: nuevoSaldoCantidad, estado };
        }
        return p;
      }));

      return [...prev, movimientoCompleto];
    });
  }, [productos]);

  const calcularLineasKardex = useCallback((productoId: string, metodo: MetodoValuacion): LineaKardex[] => {
    const movimientosProducto = movimientos
        .filter(m => m.productoId === productoId)
        .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    const lineas: LineaKardex[] = [];
    let saldoCantidad = 0;
    let saldoTotal = 0;

    for (const mov of movimientosProducto) {
        const linea: Partial<LineaKardex> = {
            fecha: new Date(mov.fecha).toLocaleDateString(),
            concepto: `${mov.tipo.replace('_', ' ')} (${mov.documento})`,
        };

        if (mov.tipo.startsWith('entrada')) {
            linea.entrada = {
                cantidad: mov.cantidad,
                costoUnitario: mov.costoUnitario,
                costoTotal: mov.costoTotal,
            };
            saldoCantidad += mov.cantidad;
            saldoTotal += mov.costoTotal;
        } else { // Salida
            let costoUnitarioSalida = mov.costoUnitario;
            if (metodo === 'promedio') {
                costoUnitarioSalida = saldoCantidad > 0 ? saldoTotal / saldoCantidad : 0;
            }
            const costoTotalSalida = mov.cantidad * costoUnitarioSalida;

            linea.salida = {
                cantidad: mov.cantidad,
                costoUnitario: costoUnitarioSalida,
                costoTotal: costoTotalSalida,
            };
            saldoCantidad -= mov.cantidad;
            saldoTotal -= costoTotalSalida;
        }

        const costoUnitarioSaldo = saldoCantidad > 0 ? saldoTotal / saldoCantidad : 0;
        linea.saldo = {
            cantidad: saldoCantidad,
            costoUnitario: costoUnitarioSaldo,
            costoTotal: saldoTotal,
        };

        lineas.push(linea as LineaKardex);
    }

    return lineas;
  }, [movimientos]);

  const resumen = useMemo((): ResumenInventario => {
    const valorTotalInventario = productos.reduce((sum, p) => sum + (p.stockActual * p.costoUnitario), 0);
    const productosBajoMinimo = productos.filter(p => p.estado === 'bajo' || p.estado === 'agotado').length;
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    
    const movimientosMes = movimientos.filter(m => new Date(m.fecha) >= inicioMes).length;
    const costoVentasMes = movimientos
      .filter(m => m.tipo === 'salida_venta' && new Date(m.fecha) >= inicioMes)
      .reduce((sum, m) => sum + m.costoTotal, 0);

    return {
      totalProductos: productos.length,
      valorTotalInventario,
      costoVentasMes,
      productosBajoMinimo,
      movimientosMes,
    };
  }, [productos, movimientos]);

  return {
    productos,
    movimientos,
    configuracion,
    resumen,
    setConfiguracion,
    registrarMovimiento,
    calcularLineasKardex,
  };
}
