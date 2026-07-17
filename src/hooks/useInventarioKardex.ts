
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useUser, useFirebase, useDoc, useCollection, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, orderBy, getDocs, where } from 'firebase/firestore';
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

const initialConfig: ConfiguracionKardex = {
    metodoValuacion: 'promedio_ponderado',
    generarAsientoAutomatico: false,
    cuentaInventarioPUC: '1435',
    cuentaCostoVentasPUC: '6135',
    alertasStockMinimo: true,
    permitirStockNegativo: false,
};

const initialBodegas: Bodega[] = [
    { id: 'bod-01', nombre: 'Bodega Principal', descripcion: 'Almacén central', totalItems: 0, valorTotal: 0 },
    { id: 'bod-02', nombre: 'Bodega Secundaria', descripcion: 'Punto de venta', totalItems: 0, valorTotal: 0 },
];

export function useInventarioKardex() {
  const { user } = useUser();
  const { firestore } = useFirebase();

  // Firestore References
  const configDocRef = useMemoFirebase(
    () => (user?.uid ? doc(firestore, `businesses/${user.uid}/kardexConfig`, 'main') : null),
    [user?.uid, firestore]
  );
  const itemsQuery = useMemoFirebase(
    () => (user?.uid ? collection(firestore, `businesses/${user.uid}/kardexItems`) : null),
    [user?.uid, firestore]
  );
  const movimientosQuery = useMemoFirebase(
    () => (user?.uid ? query(collection(firestore, `businesses/${user.uid}/kardexMovimientos`), orderBy('fecha', 'asc')) : null),
    [user?.uid, firestore]
  );

  // Data fetching
  const { data: savedConfig, isLoading: isConfigLoading } = useDoc<ConfiguracionKardex>(configDocRef);
  const { data: itemsData, isLoading: areItemsLoading } = useCollection<ItemInventario>(itemsQuery);
  const { data: movimientosData, isLoading: areMovimientosLoading } = useCollection<MovimientoKardex>(movimientosQuery);

  // State
  const [configuracion, setConfiguracion] = useState<ConfiguracionKardex>(initialConfig);
  const [bodegas, setBodegas] = useState<Bodega[]>(initialBodegas);

  const items = itemsData ?? [];
  const movimientos = movimientosData ?? [];

  useEffect(() => {
    if (savedConfig) {
      setConfiguracion(prev => ({ ...prev, ...savedConfig }));
    }
  }, [savedConfig]);

  const determinarEstadoStock = (stock: number, min: number, max: number): EstadoStock => {
      if (stock <= 0) return 'agotado';
      if (stock <= min) return 'bajo';
      if (max > 0 && stock > max) return 'sobre_stock';
      return 'normal';
  };

  const registrarOActualizarItem = useCallback(async (data: NuevoItemForm) => {
    if (!user?.uid || !firestore) return;
    const itemCollectionRef = collection(firestore, `businesses/${user.uid}/kardexItems`);

    if (data.id) { // Update
        const itemDocRef = doc(itemCollectionRef, data.id);
        const { id, ...itemToUpdate } = data;
        await setDocumentNonBlocking(itemDocRef, itemToUpdate, { merge: true });
    } else { // Create
        const estado = determinarEstadoStock(0, data.stockMinimo, data.stockMaximo);
        const { id, ...cleanData } = data;

        const nuevoItem: Omit<ItemInventario, 'id'> = {
            ...cleanData,
            stockActual: 0,
            estado,
            activo: true,
        };
        await addDocumentNonBlocking(itemCollectionRef, nuevoItem);
    }
  }, [user?.uid, firestore]);

  const registrarMovimiento = useCallback(async (form: NuevoMovimientoForm) => {
    console.log('BUSINESS ID REAL:', user?.uid);
    console.log('FORM RECIBIDO:', form);

    if (!user?.uid || !firestore || !items || !movimientos) {
      throw new Error('Servicios de inventario no listos.');
    }

    const targetId = form.itemId || (form as any).productoId;
    const item = items.find(i => i.id === targetId);
    if (!item) throw new Error('El ítem seleccionado no existe.');

    const historialPrevio = movimientos
      .filter(m => (m.itemId || (m as any).productoId) === targetId)
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    console.log('HISTORIAL ENCONTRADO:', historialPrevio.length, historialPrevio);

    let saldoCantAcumulado = 0;
    let saldoValorTotalAcumulado = 0;

    for (const m of historialPrevio) {
      if (m.tipo.startsWith('entrada') || (m.tipo === 'ajuste_inventario_fisico' && m.cantidad > 0)) {
        saldoCantAcumulado += m.cantidad;
        saldoValorTotalAcumulado += (m.cantidad * m.costoUnitario);
      } else {
        const promedioEnEsePunto = saldoCantAcumulado > 0 ? (saldoValorTotalAcumulado / saldoCantAcumulado) : m.costoUnitario;
        // La cantidad ya es negativa para ajustes de salida en el historial reconstruido, 
        // pero m.cantidad en DB se guarda positiva para salidas normales, hay que ser cuidadoso.
        const cantAbs = Math.abs(m.cantidad);
        saldoCantAcumulado -= cantAbs;
        saldoValorTotalAcumulado -= (cantAbs * promedioEnEsePunto);
      }
    }

    console.log('SALDO ACUMULADO:', saldoCantAcumulado, saldoValorTotalAcumulado);

    const isAjusteFisico = form.tipo === 'ajuste_inventario_fisico';
    const cantidadParaKardex = isAjusteFisico ? (form.cantidad - saldoCantAcumulado) : form.cantidad;

    // Validación de stock: NO aplica para ajustes físicos (donde form.cantidad es el stock final)
    if (!isAjusteFisico && (form.tipo.startsWith('salida') || form.tipo.startsWith('ajuste_danio'))) {
      if (!configuracion.permitirStockNegativo && form.cantidad > saldoCantAcumulado) {
        throw new Error(`Stock insuficiente. Disponible: ${saldoCantAcumulado}`);
      }
    }

    const costoPromedioActual = saldoCantAcumulado > 0 ? (saldoValorTotalAcumulado / saldoCantAcumulado) : (item.costoUnitario || 0);
    const costoUnitarioFinal = form.tipo === 'entrada_compra' ? form.costoUnitario : costoPromedioActual;
    const costoTotalFinal = Math.abs(cantidadParaKardex) * costoUnitarioFinal;

    console.log('COSTO FINAL CALCULADO:', costoUnitarioFinal, costoTotalFinal);

    const nuevoMovimientoData: any = { 
        ...form, 
        cantidad: cantidadParaKardex, // Guardamos el delta para ajustes físicos
        costoUnitario: costoUnitarioFinal,
        costoTotal: costoTotalFinal, 
        observaciones: form.observaciones || '' 
    };
    
    const movCollectionRef = collection(firestore, `businesses/${user.uid}/kardexMovimientos`);
    await addDocumentNonBlocking(movCollectionRef, nuevoMovimientoData);

    const stockFinalMaestro = isAjusteFisico ? form.cantidad : (form.tipo.startsWith('entrada') ? saldoCantAcumulado + form.cantidad : saldoCantAcumulado - form.cantidad);
    const valorFinalMaestro = isAjusteFisico ? (saldoValorTotalAcumulado + (cantidadParaKardex * costoUnitarioFinal)) : (form.tipo.startsWith('entrada') ? saldoValorTotalAcumulado + costoTotalFinal : saldoValorTotalAcumulado - costoTotalFinal);
    
    const nuevoCostoPromedioMaestro = stockFinalMaestro > 0 ? (valorFinalMaestro / stockFinalMaestro) : costoUnitarioFinal;
    const nuevoEstado = determinarEstadoStock(stockFinalMaestro, item.stockMinimo, item.stockMaximo);
    
    const itemDocRef = doc(firestore, `businesses/${user.uid}/kardexItems`, item.id);
    await updateDocumentNonBlocking(itemDocRef, {
        stockActual: stockFinalMaestro,
        costoUnitario: nuevoCostoPromedioMaestro,
        estado: nuevoEstado,
        updatedAt: new Date().toISOString()
    });

  }, [user?.uid, firestore, items, movimientos, configuracion]);

  const calcularKardex = useCallback((itemId: string, metodo: MetodoValuacion): LineaKardexCalculada[] => {
    const movimientosProducto = movimientos
      .filter(m => (m.itemId || (m as any).productoId) === itemId)
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    const lineas: LineaKardexCalculada[] = [];
    let saldoCantidad = 0;
    let saldoValorTotal = 0;
    let capas: { cantidad: number; costoUnitario: number }[] = [];

    for (const mov of movimientosProducto) {
      let entrada = null;
      let salida = null;

      const esEntrada = mov.tipo.startsWith('entrada') || (mov.tipo === 'ajuste_inventario_fisico' && mov.cantidad > 0);
      const esSalida = mov.tipo.startsWith('salida') || mov.tipo.startsWith('ajuste_danio') || (mov.tipo === 'ajuste_inventario_fisico' && mov.cantidad < 0);

      const cantidadAbs = Math.abs(mov.cantidad);

      if (esEntrada) {
        entrada = {
          cantidad: cantidadAbs,
          costoUnitario: mov.costoUnitario,
          costoTotal: cantidadAbs * mov.costoUnitario,
        };
        saldoCantidad += cantidadAbs;
        saldoValorTotal += entrada.costoTotal;

        if (metodo === 'peps' || metodo === 'ueps') {
          capas.push({ cantidad: cantidadAbs, costoUnitario: mov.costoUnitario });
        }
      } else if (esSalida) {
        let costoSalidaTotal = 0;
        let costoUnitarioSalida = 0;

        if (metodo === 'promedio_ponderado') {
          costoUnitarioSalida = saldoCantidad > 0 ? (saldoValorTotal / saldoCantidad) : mov.costoUnitario;
          costoSalidaTotal = cantidadAbs * costoUnitarioSalida;
        } else {
          let cantidadSalidaRestante = cantidadAbs;
          let costoAcumulado = 0;
          const capasLocal = JSON.parse(JSON.stringify(capas));

          while (cantidadSalidaRestante > 0 && capasLocal.length > 0) {
            const capaIndex = metodo === 'peps' ? 0 : capasLocal.length - 1;
            const capa = capasLocal[capaIndex];
            const cantidadAConsumir = Math.min(cantidadSalidaRestante, capa.cantidad);
            
            costoAcumulado += cantidadAConsumir * capa.costoUnitario;
            capa.cantidad -= cantidadAConsumir;
            cantidadSalidaRestante -= cantidadAConsumir;

            if (capa.cantidad === 0) {
              if (metodo === 'peps') capasLocal.shift(); else capasLocal.pop();
            }
          }
          capas = capasLocal;
          costoSalidaTotal = costoAcumulado;
          costoUnitarioSalida = cantidadAbs > 0 ? (costoSalidaTotal / cantidadAbs) : 0;
        }
        
        salida = {
          cantidad: cantidadAbs,
          costoUnitario: costoUnitarioSalida,
          costoTotal: costoSalidaTotal,
        };

        saldoCantidad -= cantidadAbs;
        saldoValorTotal -= costoSalidaTotal;
      }
      
      const costoUnitarioSaldo = saldoCantidad > 0 ? (saldoValorTotal / saldoCantidad) : 0;

      lineas.push({
        fecha: new Date(mov.fecha).toLocaleDateString(),
        concepto: mov.tipo.replace(/_/g, ' '),
        documento: mov.documento,
        entrada,
        salida,
        saldo: {
          cantidad: saldoCantidad,
          costoUnitario: costoUnitarioSaldo,
          costoTotal: saldoValorTotal,
        },
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
        .filter(m => (m.tipo === 'salida_venta' || m.tipo === 'ajuste_danio') && new Date(m.fecha) >= inicioMes)
        .reduce((sum, m) => sum + m.costoTotal, 0);
    const itemsBajoMinimo = items.filter(i => i.estado === 'bajo').length;
    const itemsAgotados = items.filter(i => i.estado === 'agotado').length;
    const movimientosMes = movimientos.filter(m => new Date(m.fecha) >= inicioMes).length;

    return { totalItems, totalProductos, totalInsumos, valorTotalInventario, costoVentasMes, itemsBajoMinimo, itemsAgotados, movimientosMes };
  }, [items, movimientos]);
  
  const actualizarConfiguracion = useCallback((config: ConfiguracionKardex) => {
    if (!configDocRef) return;
    setDocumentNonBlocking(configDocRef, config, { merge: true });
    setConfiguracion(config);
  }, [configDocRef]);
  
  const isLoading = isConfigLoading || areItemsLoading || areMovimientosLoading;

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
    isLoading,
  };
}
