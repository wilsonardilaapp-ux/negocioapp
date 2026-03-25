
'use client';

import { useState, useMemo, useCallback } from 'react';
import type {
  ItemInventario,
  MovimientoKardex,
  ConfiguracionKardex,
  ResumenKardex,
  NuevoMovimientoForm,
  MetodoValuacion,
  LineaKardexCalculada,
  Bodega,
  EstadoStock,
  NuevoItemForm,
} from '@/types/kardex.types';

const getInitialMockData = () => {
    const items: ItemInventario[] = [
        { id: 'item-001', codigo: 'CAM-01', nombre: 'Camisa Polo Azul', tipoItem: 'producto', categoria: 'Ropa', unidadMedida: 'unidad', stockActual: 50, stockMinimo: 10, stockMaximo: 100, costoUnitario: 35000, cuentaContablePUC: '143501', bodega: 'Principal', estado: 'normal', activo: true },
        { id: 'item-002', codigo: 'PAN-01', nombre: 'Pantalón Jean Clásico', tipoItem: 'producto', categoria: 'Ropa', unidadMedida: 'unidad', stockActual: 8, stockMinimo: 15, stockMaximo: 80, costoUnitario: 70000, cuentaContablePUC: '143501', bodega: 'Principal', estado: 'bajo', activo: true },
        { id: 'item-003', codigo: 'TEN-01', nombre: 'Tenis Deportivos Blancos', tipoItem: 'producto', categoria: 'Calzado', unidadMedida: 'par', stockActual: 0, stockMinimo: 5, stockMaximo: 50, costoUnitario: 120000, cuentaContablePUC: '143501', bodega: 'Principal', estado: 'agotado', activo: true },
        { id: 'item-004', codigo: 'GOR-01', nombre: 'Gorra Negra Logo', tipoItem: 'producto', categoria: 'Accesorios', unidadMedida: 'unidad', stockActual: 120, stockMinimo: 20, stockMaximo: 100, costoUnitario: 25000, cuentaContablePUC: '143501', bodega: 'Principal', estado: 'sobre_stock', activo: true },
        { id: 'item-005', codigo: 'INS-01', nombre: 'Hilo de Algodón (metro)', tipoItem: 'insumo', categoria: 'Materia Prima', unidadMedida: 'metro', stockActual: 500, stockMinimo: 100, stockMaximo: 1000, costoUnitario: 200, cuentaContablePUC: '140501', bodega: 'Principal', estado: 'normal', activo: true },
        { id: 'item-006', codigo: 'INS-02', nombre: 'Botón Plástico (unidad)', tipoItem: 'insumo', categoria: 'Materia Prima', unidadMedida: 'unidad', stockActual: 2000, stockMinimo: 500, stockMaximo: 5000, costoUnitario: 50, cuentaContablePUC: '140501', bodega: 'Principal', estado: 'normal', activo: true },
        { id: 'item-007', codigo: 'INS-03', nombre: 'Etiqueta de Marca (unidad)', tipoItem: 'insumo', categoria: 'Materia Prima', unidadMedida: 'unidad', stockActual: 800, stockMinimo: 200, stockMaximo: 2000, costoUnitario: 150, cuentaContablePUC: '140501', bodega: 'Principal', estado: 'normal', activo: true },
    ];
    const movimientos: MovimientoKardex[] = [
        { id: 'mov-001', fecha: '2023-10-01T10:00:00Z', tipo: 'entrada_compra', itemId: 'item-001', documento: 'FC-1020', cantidad: 40, costoUnitario: 34000, costoTotal: 1360000, saldoCantidad: 40, saldoValorTotal: 1360000, observaciones: 'Compra inicial' },
        { id: 'mov-002', fecha: '2023-10-05T14:00:00Z', tipo: 'salida_venta', itemId: 'item-001', documento: 'FV-501', cantidad: 10, costoUnitario: 34000, costoTotal: 340000, saldoCantidad: 30, saldoValorTotal: 1020000, observaciones: 'Venta cliente minorista' },
        { id: 'mov-003', fecha: '2023-10-10T11:00:00Z', tipo: 'entrada_compra', itemId: 'item-001', documento: 'FC-1055', cantidad: 30, costoUnitario: 36000, costoTotal: 1080000, saldoCantidad: 60, saldoValorTotal: 2100000, observaciones: 'Re-stock' },
        { id: 'mov-004', fecha: '2023-10-15T09:30:00Z', tipo: 'salida_venta', itemId: 'item-001', documento: 'FV-520', cantidad: 10, costoUnitario: 35000, costoTotal: 350000, saldoCantidad: 50, saldoValorTotal: 1750000, observaciones: '' },
    ];
    const bodegas: Bodega[] = [
        { id: 'bod-01', nombre: 'Bodega Principal', descripcion: 'Almacén central', totalItems: 7, valorTotal: 0 },
        { id: 'bod-02', nombre: 'Bodega Secundaria', descripcion: 'Punto de venta', totalItems: 0, valorTotal: 0 },
    ];
    return { items, movimientos, bodegas };
}

export function useKardex() {
  const [items, setItems] = useState<ItemInventario[]>(() => getInitialMockData().items);
  const [movimientos, setMovimientos] = useState<MovimientoKardex[]>(() => getInitialMockData().movimientos);
  const [configuracion, setConfiguracion] = useState<ConfiguracionKardex>({
    metodoValuacion: 'promedio_ponderado',
    generarAsientoAutomatico: false,
    cuentaInventarioPUC: '1435',
    cuentaCostoVentasPUC: '6135',
    alertasStockMinimo: true,
    permitirStockNegativo: false,
  });
  const [bodegas, setBodegas] = useState<Bodega[]>(() => getInitialMockData().bodegas);

  const registrarOActualizarItem = useCallback((data: NuevoItemForm) => {
    setItems(prevItems => {
        const estado = determinarEstadoStock(0, data.stockMinimo, data.stockMaximo);

        if (data.id) { // Actualizar
            return prevItems.map(item => item.id === data.id ? { ...item, ...data } : item);
        } else { // Crear
            const nuevoItem: ItemInventario = {
                ...data,
                id: `item-${Date.now()}`,
                stockActual: 0,
                estado,
                activo: true,
            };
            return [nuevoItem, ...prevItems];
        }
    });
  }, []);

  const registrarMovimiento = useCallback((form: NuevoMovimientoForm) => {
    setMovimientos(prevMovs => {
      const item = items.find(i => i.id === form.itemId);
      if (!item) return prevMovs;

      const costoTotal = form.cantidad * form.costoUnitario;
      const ultimoMovimiento = prevMovs.filter(m => m.itemId === form.itemId).pop();
      const saldoAnterior = ultimoMovimiento ? { cant: ultimoMovimiento.saldoCantidad, total: ultimoMovimiento.saldoValorTotal } : { cant: 0, total: 0 };
      
      let nuevoSaldoCantidad = saldoAnterior.cant;
      let nuevoSaldoValorTotal = saldoAnterior.total;

      if (form.tipo.startsWith('entrada')) {
        nuevoSaldoCantidad += form.cantidad;
        nuevoSaldoValorTotal += costoTotal;
      } else {
        if (!configuracion.permitirStockNegativo && form.cantidad > item.stockActual) {
          throw new Error('Stock insuficiente para la salida.');
        }
        nuevoSaldoCantidad -= form.cantidad;
        let costoSalida = costoTotal;
        if(configuracion.metodoValuacion === 'promedio_ponderado' && saldoAnterior.cant > 0) {
            costoSalida = form.cantidad * (saldoAnterior.total / saldoAnterior.cant);
        }
        nuevoSaldoValorTotal -= costoSalida;
      }
      
      const nuevoMovimiento: MovimientoKardex = { ...form, id: `mov-${Date.now()}`, costoTotal, saldoCantidad: nuevoSaldoCantidad, saldoValorTotal: nuevoSaldoValorTotal };
      
      setItems(prevItems => prevItems.map(p => {
          if (p.id === form.itemId) {
              const estado = determinarEstadoStock(nuevoSaldoCantidad, p.stockMinimo, p.stockMaximo);
              return { ...p, stockActual: nuevoSaldoCantidad, estado };
          }
          return p;
      }));

      return [...prevMovs, nuevoMovimiento];
    });
  }, [items, configuracion.permitirStockNegativo, configuracion.metodoValuacion]);

  const calcularKardex = useCallback((itemId: string, metodo: MetodoValuacion): LineaKardexCalculada[] => {
    const movimientosProducto = movimientos
      .filter(m => m.itemId === itemId)
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    const lineas: LineaKardexCalculada[] = [];
    let saldoCantidad = 0;
    let saldoValorTotal = 0;
    
    // For PEPS/UEPS, we need to track layers of inventory
    let capas: { cantidad: number; costoUnitario: number }[] = [];

    for (const mov of movimientosProducto) {
      let costoUnitarioResultante = mov.costoUnitario;

      if (mov.tipo.startsWith('entrada')) {
        saldoCantidad += mov.cantidad;
        saldoValorTotal += mov.costoTotal;
        costoUnitarioResultante = mov.costoUnitario;
        
        if (metodo === 'peps' || metodo === 'ueps') {
          capas.push({ cantidad: mov.cantidad, costoUnitario: mov.costoUnitario });
        }

      } else if (mov.tipo.startsWith('salida')) {
        let costoSalidaTotal = 0;
        let cantidadSalida = mov.cantidad;

        if (metodo === 'promedio_ponderado') {
          costoUnitarioResultante = saldoCantidad > 0 ? saldoValorTotal / saldoCantidad : 0;
          costoSalidaTotal = cantidadSalida * costoUnitarioResultante;
        } else { // PEPS o UEPS
          let costoAcumuladoSalida = 0;
          let cantidadProcesada = 0;
          
          while (cantidadSalida > 0 && capas.length > 0) {
            const capaIndex = metodo === 'peps' ? 0 : capas.length - 1;
            const capa = capas[capaIndex];
            
            const cantidadAConsumir = Math.min(cantidadSalida, capa.cantidad);
            
            costoAcumuladoSalida += cantidadAConsumir * capa.costoUnitario;
            cantidadProcesada += cantidadAConsumir;
            
            capa.cantidad -= cantidadAConsumir;
            cantidadSalida -= cantidadAConsumir;

            if (capa.cantidad === 0) {
              if (metodo === 'peps') {
                capas.shift();
              } else {
                capas.pop();
              }
            }
          }
          costoSalidaTotal = costoAcumuladoSalida;
          costoUnitarioResultante = cantidadProcesada > 0 ? costoAcumuladoSalida / cantidadProcesada : 0;
        }
        
        saldoCantidad -= mov.cantidad;
        saldoValorTotal -= costoSalidaTotal;
      }
      
      lineas.push({
        movimiento: mov,
        costoUnitarioResultante,
        saldoCantidad,
        saldoValorTotal,
      });
    }

    return lineas;
  }, [movimientos]);

  const resumen = useMemo((): ResumenKardex => {
    const totalItems = items.length;
    const totalProductos = items.filter(i => i.tipoItem === 'producto').length;
    const totalInsumos = items.filter(i => i.tipoItem === 'insumo').length;
    const valorTotalInventario = items.reduce((sum, i) => sum + (i.stockActual * i.costoUnitario), 0);
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const costoVentasMes = movimientos
        .filter(m => m.tipo === 'salida_venta' && new Date(m.fecha) >= inicioMes)
        .reduce((sum, m) => sum + m.costoTotal, 0);
    const itemsBajoMinimo = items.filter(i => i.estado === 'bajo').length;
    const itemsAgotados = items.filter(i => i.estado === 'agotado').length;
    const movimientosMes = movimientos.filter(m => new Date(m.fecha) >= inicioMes).length;

    return { totalItems, totalProductos, totalInsumos, valorTotalInventario, costoVentasMes, itemsBajoMinimo, itemsAgotados, movimientosMes };
  }, [items, movimientos]);
  
  const actualizarConfiguracion = (config: ConfiguracionKardex) => {
    setConfiguracion(config);
  };
  
  const determinarEstadoStock = (stock: number, min: number, max: number): EstadoStock => {
      if (stock <= 0) return 'agotado';
      if (stock <= min) return 'bajo';
      if (stock > max) return 'sobre_stock';
      return 'normal';
  };

  return {
    items,
    movimientos,
    configuracion,
    bodegas,
    resumen,
    registrarMovimiento,
    calcularKardex,
    actualizarConfiguracion,
    registrarOActualizarItem,
  };
}
