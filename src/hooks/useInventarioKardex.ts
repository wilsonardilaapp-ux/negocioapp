
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useUser, useFirebase, useDoc, useCollection, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, orderBy, getDocs, where, runTransaction } from 'firebase/firestore';
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

    if (!user?.uid || !firestore) {
      throw new Error('Servicios de inventario no listos.');
    }

    await runTransaction(firestore, async (transaction) => {
      // 1. LECTURA: Obtener el estado más fresco del ítem desde el servidor
      const targetId = form.itemId || (form as any).productoId;
      const itemDocRef = doc(firestore, `businesses/${user.uid}/kardexItems`, targetId);
      const itemSnap = await transaction.get(itemDocRef);

      if (!itemSnap.exists()) {
        throw new Error('El ítem seleccionado no existe en el servidor.');
      }

      const itemData = itemSnap.data() as ItemInventario;
      console.log('SALDO ACTUAL (SERVIDOR):', itemData.stockActual, itemData.costoUnitario);

      // --- FASE 1: CÁLCULO DE CANTIDADES Y VALIDACIÓN ---
      let cantidadParaMovimiento = form.cantidad;
      let stockFinal = 0;
      const isAjusteFisico = form.tipo === 'ajuste_inventario_fisico';

      if (isAjusteFisico) {
        // Delta = Conteo Físico - Stock en Sistema
        cantidadParaMovimiento = form.cantidad - itemData.stockActual;
        stockFinal = form.cantidad;
      } else if (form.tipo.startsWith('entrada')) {
        stockFinal = itemData.stockActual + form.cantidad;
      } else {
        stockFinal = itemData.stockActual - form.cantidad;
      }

      // Validación de stock insuficiente (solo para salidas reales, no ajustes físicos)
      if (!isAjusteFisico && (form.tipo.startsWith('salida') || form.tipo.startsWith('ajuste_danio'))) {
        if (!configuracion.permitirStockNegativo && form.cantidad > itemData.stockActual) {
          throw new Error(`Stock insuficiente. Disponible: ${itemData.stockActual}`);
        }
      }

      // --- FASE 2: CÁLCULO DE COSTOS (PROMEDIO PONDERADO) ---
      const costoUnitarioActual = itemData.costoUnitario || 0;
      let costoUnitarioParaMovimiento = costoUnitarioActual;
      let nuevoCostoPromedioMaestro = costoUnitarioActual;

      if (form.tipo === 'entrada_compra') {
        costoUnitarioParaMovimiento = form.costoUnitario;
        const valorInventarioActual = itemData.stockActual * costoUnitarioActual;
        const valorNuevaEntrada = form.cantidad * form.costoUnitario;
        nuevoCostoPromedioMaestro = stockFinal > 0 ? (valorInventarioActual + valorNuevaEntrada) / stockFinal : form.costoUnitario;
      }

      const costoTotalMovimiento = Math.abs(cantidadParaMovimiento) * costoUnitarioParaMovimiento;
      console.log('COSTO FINAL CALCULADO:', costoUnitarioParaMovimiento, costoTotalMovimiento);

      // --- FASE 3: DETERMINAR NUEVO ESTADO ---
      const nuevoEstado = determinarEstadoStock(stockFinal, itemData.stockMinimo, itemData.stockMaximo);

      // --- FASE 4: ESCRITURA ATÓMICA ---
      // A. Registrar Movimiento
      const movCollectionRef = collection(firestore, `businesses/${user.uid}/kardexMovimientos`);
      const newMovRef = doc(movCollectionRef);
      transaction.set(newMovRef, {
        ...form,
        cantidad: cantidadParaMovimiento,
        costoUnitario: costoUnitarioParaMovimiento,
        costoTotal: costoTotalMovimiento,
        observaciones: form.observaciones || '',
        createdAt: new Date().toISOString()
      });

      // B. Actualizar Maestro de Ítems
      transaction.update(itemDocRef, {
        stockActual: stockFinal,
        costoUnitario: nuevoCostoPromedioMaestro,
        estado: nuevoEstado,
        updatedAt: new Date().toISOString()
      });
    });

  }, [user?.uid, firestore, configuracion]);

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
