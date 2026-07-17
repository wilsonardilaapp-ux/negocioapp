
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
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
    if (!user?.uid || !firestore || !items) {
      throw new Error('Usuario, base de datos o ítems no disponibles.');
    }

    const item = items.find(i => i.id === form.itemId);
    if (!item) {
      throw new Error('El ítem seleccionado no existe.');
    }

    // LÓGICA DE COSTEO AUTOMÁTICO PARA SALIDAS/AJUSTES (PROMEDIO PONDERADO)
    const costoUnitarioTransaccion = form.tipo === 'entrada_compra' 
        ? form.costoUnitario 
        : item.costoUnitario;

    const costoTotal = form.cantidad * costoUnitarioTransaccion;

    if (form.tipo.startsWith('salida') || form.tipo.startsWith('ajuste')) {
      if (!configuracion.permitirStockNegativo && form.cantidad > item.stockActual) {
        throw new Error('Stock insuficiente para realizar el movimiento.');
      }
    }
    
    // GUARDADO DEL MOVIMIENTO: Usamos la variable costoTotal calculada para evitar el bug del $0
    const nuevoMovimientoData: Omit<MovimientoKardex, 'id'> = { 
        ...form, 
        costoUnitario: costoUnitarioTransaccion,
        costoTotal, 
        observaciones: form.observaciones || '' 
    };
    
    const movCollectionRef = collection(firestore, `businesses/${user.uid}/kardexMovimientos`);
    await addDocumentNonBlocking(movCollectionRef, nuevoMovimientoData);

    // --- SINCRONIZACIÓN TOTAL (RECALCULO DESDE HISTORIAL) ---
    // Después de guardar el nuevo movimiento, recalculamos el estado del ítem desde cero
    // para garantizar consistencia absoluta entre la pestaña Productos y Kardex.
    
    const movsSnap = await getDocs(query(movCollectionRef, where('itemId', '==', item.id), orderBy('fecha', 'asc')));
    const allMovs = movsSnap.docs.map(d => d.data() as MovimientoKardex);

    let finalCantidad = 0;
    let finalValorTotal = 0;

    for (const m of allMovs) {
      if (m.tipo.startsWith('entrada')) {
        finalCantidad += m.cantidad;
        finalValorTotal += m.costoTotal;
      } else {
        // Salidas y Ajustes restan cantidad y valor proporcional (según el costoTotal registrado)
        finalCantidad -= m.cantidad;
        finalValorTotal -= m.costoTotal;
      }
    }

    const finalCostoUnitario = finalCantidad > 0 ? (finalValorTotal / finalCantidad) : costoUnitarioTransaccion;
    const nuevoEstado = determinarEstadoStock(finalCantidad, item.stockMinimo, item.stockMaximo);
    
    const itemDocRef = doc(firestore, `businesses/${user.uid}/kardexItems`, item.id);
    await updateDocumentNonBlocking(itemDocRef, {
        stockActual: finalCantidad,
        costoUnitario: finalCostoUnitario,
        estado: nuevoEstado,
        updatedAt: new Date().toISOString()
    });

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
      } else if (mov.tipo.startsWith('salida') || mov.tipo.startsWith('ajuste')) {
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
