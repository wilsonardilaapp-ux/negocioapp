
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
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
  const firestore = useFirestore();

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
        const itemToUpdate = { ...data };
        delete itemToUpdate.id;
        await setDocumentNonBlocking(itemDocRef, itemToUpdate, { merge: true });
    } else { // Create
        const estado = determinarEstadoStock(0, data.stockMinimo, data.stockMaximo);
        const nuevoItem: Omit<ItemInventario, 'id'> = {
            ...data,
            stockActual: 0,
            estado,
            activo: true,
        };
        await addDocumentNonBlocking(itemCollectionRef, nuevoItem);
    }
  }, [user?.uid, firestore]);

  const registrarMovimiento = useCallback(async (form: NuevoMovimientoForm) => {
    if (!user?.uid || !firestore || !items) {
      throw new Error('Usuario, base de datos o ítems no disponibles.');
    }

    const item = items.find(i => i.id === form.itemId);
    if (!item) {
      throw new Error('El ítem seleccionado no existe.');
    }

    const costoTotal = form.cantidad * form.costoUnitario;

    if (form.tipo.startsWith('salida')) {
      if (!configuracion.permitirStockNegativo && form.cantidad > item.stockActual) {
        throw new Error('Stock insuficiente para la salida.');
      }
    }
    
    const nuevoMovimientoData: Omit<MovimientoKardex, 'id'> = { ...form, costoTotal, observaciones: form.observaciones || '' };
    const movCollectionRef = collection(firestore, `businesses/${user.uid}/kardexMovimientos`);
    await addDocumentNonBlocking(movCollectionRef, nuevoMovimientoData);

    const nuevoStockActual = form.tipo.startsWith('entrada')
      ? item.stockActual + form.cantidad
      : item.stockActual - form.cantidad;
      
    const nuevoEstado = determinarEstadoStock(nuevoStockActual, item.stockMinimo, item.stockMaximo);
    
    const updatedItemData: Partial<ItemInventario> = {
        stockActual: nuevoStockActual,
        estado: nuevoEstado,
    };

    if (form.tipo === 'entrada_compra') {
        if (configuracion.metodoValuacion === 'promedio_ponderado') {
            const valorTotalAnterior = item.stockActual * item.costoUnitario;
            const nuevoValorTotal = valorTotalAnterior + costoTotal;
            updatedItemData.costoUnitario = nuevoStockActual > 0 ? nuevoValorTotal / nuevoStockActual : form.costoUnitario;
        } else {
            updatedItemData.costoUnitario = form.costoUnitario;
        }
    }
    
    const itemDocRef = doc(firestore, `businesses/${user.uid}/kardexItems`, item.id);
    await updateDocumentNonBlocking(itemDocRef, updatedItemData);

  }, [user?.uid, firestore, items, configuracion]);

  const calcularKardex = useCallback((itemId: string, metodo: MetodoValuacion): LineaKardexCalculada[] => {
    const movimientosProducto = movimientos
      .filter(m => m.itemId === itemId)
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    const lineas: LineaKardexCalculada[] = [];
    let saldoCantidad = 0;
    let saldoValorTotal = 0;
    let capas: { cantidad: number; costoUnitario: number }[] = [];

    for (const mov of movimientosProducto) {
      let entrada = null;
      let salida = null;

      if (mov.tipo.startsWith('entrada')) {
        entrada = {
          cantidad: mov.cantidad,
          costoUnitario: mov.costoUnitario,
          costoTotal: mov.costoTotal,
        };
        saldoCantidad += mov.cantidad;
        saldoValorTotal += mov.costoTotal;

        if (metodo === 'peps' || metodo === 'ueps') {
          capas.push({ cantidad: mov.cantidad, costoUnitario: mov.costoUnitario });
        }
      } else if (mov.tipo.startsWith('salida')) {
        let costoSalidaTotal = 0;
        let costoUnitarioSalida = 0;

        if (metodo === 'promedio_ponderado') {
          costoUnitarioSalida = saldoCantidad > 0 ? saldoValorTotal / saldoCantidad : 0;
          costoSalidaTotal = mov.cantidad * costoUnitarioSalida;
        } else {
          let cantidadSalidaRestante = mov.cantidad;
          let costoAcumulado = 0;

          while (cantidadSalidaRestante > 0 && capas.length > 0) {
            const capaIndex = metodo === 'peps' ? 0 : capas.length - 1;
            const capa = capas[capaIndex];
            const cantidadAConsumir = Math.min(cantidadSalidaRestante, capa.cantidad);
            
            costoAcumulado += cantidadAConsumir * capa.costoUnitario;
            capa.cantidad -= cantidadAConsumir;
            cantidadSalidaRestante -= cantidadAConsumir;

            if (capa.cantidad === 0) {
              if (metodo === 'peps') capas.shift(); else capas.pop();
            }
          }
          costoSalidaTotal = costoAcumulado;
          costoUnitarioSalida = mov.cantidad > 0 ? costoSalidaTotal / mov.cantidad : 0;
        }
        
        salida = {
          cantidad: mov.cantidad,
          costoUnitario: costoUnitarioSalida,
          costoTotal: costoSalidaTotal,
        };

        saldoCantidad -= mov.cantidad;
        saldoValorTotal -= costoSalidaTotal;
      }
      
      const costoUnitarioSaldo = saldoCantidad > 0 ? saldoValorTotal / saldoCantidad : 0;

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
        .filter(m => m.tipo === 'salida_venta' && new Date(m.fecha) >= inicioMes)
        .reduce((sum, m) => sum + m.costoTotal, 0);
    const itemsBajoMinimo = items.filter(i => i.estado === 'bajo').length;
    const itemsAgotados = items.filter(i => i.estado === 'agotado').length;
    const movimientosMes = movimientos.filter(m => new Date(m.fecha) >= inicioMes).length;

    return { totalItems, totalProductos, totalInsumos, valorTotalInventario, costoVentasMes, itemsBajoMinimo, itemsAgotados, movimientosMes };
  }, [items, movimientos]);
  
  const actualizarConfiguracion = useCallback((config: ConfiguracionKardex) => {
    if (!configDocRef) return;
    setDocumentNonBlocking(configDocRef, config, { merge: true });
    setConfiguracion(config); // Update local state optimistically
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
