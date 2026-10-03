import { getAdminFirestore } from '@/firebase/server-init';
import { obtenerAccionesJev } from './jevMemory';

export interface LoteVencimientoJev {
  id: string;
  productId: string;
  productoNombre: string;
  batchNumber?: string;
  expirationDate: string;
  quantity: number;
  diasRestantes: number;
  estado: 'vencido' | 'critico' | 'proximo' | 'vigente';
}

export interface ContextoVencimientos {
  businessId: string;
  totalLotes: number;
  vencidosCount: number;
  criticosCount: number; // <= 7 días
  proximosCount: number;  // <= 30 días
  lotesVencidos: LoteVencimientoJev[];
  lotesCriticos: LoteVencimientoJev[];
  lotesProximos: LoteVencimientoJev[];
  todosLosLotes: LoteVencimientoJev[];
  historialMemoria: any[];
  estado: 'optimo' | 'atencion_requerida' | 'sin_datos';
  ultimaActualizacion: string;
}

/**
 * Agregador de contexto para Vencimientos (SOLO LECTURA).
 * Consulta inventoryBatches y products sin modificar ningún registro.
 */
export async function getVencimientosContext(businessId: string): Promise<ContextoVencimientos> {
  if (!businessId || typeof businessId !== 'string') {
    throw new Error('[JEV CONTEXT VENCIMIENTOS] businessId es obligatorio.');
  }

  const firestore = await getAdminFirestore();

  try {
    // 1. Lectura de lotes (SOLO LECTURA)
    const batchesSnap = await firestore
      .collection(`businesses/${businessId}/inventoryBatches`)
      .get();

    if (batchesSnap.empty) {
      return {
        businessId,
        totalLotes: 0,
        vencidosCount: 0,
        criticosCount: 0,
        proximosCount: 0,
        lotesVencidos: [],
        lotesCriticos: [],
        lotesProximos: [],
        todosLosLotes: [],
        historialMemoria: [],
        estado: 'sin_datos',
        ultimaActualizacion: new Date().toISOString(),
      };
    }

    // 2. Mapeo de nombres de productos
    const productsMap = new Map<string, string>();
    try {
      const prodSnap = await firestore.collection(`businesses/${businessId}/products`).get();
      prodSnap.forEach((doc) => {
        productsMap.set(doc.id, doc.data().name || 'Producto');
      });
    } catch (e) {
      // Opcional
    }

    const ahora = new Date();
    const hoyMidnight = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();

    const todosLosLotes: LoteVencimientoJev[] = [];

    batchesSnap.forEach((doc) => {
      const b = doc.data();
      const expDate = b.expirationDate ? new Date(b.expirationDate) : new Date();
      const expMidnight = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate()).getTime();
      const diasRestantes = Math.round((expMidnight - hoyMidnight) / (1000 * 60 * 60 * 24));

      let estado: 'vencido' | 'critico' | 'proximo' | 'vigente' = 'vigente';
      if (diasRestantes < 0) estado = 'vencido';
      else if (diasRestantes <= 7) estado = 'critico';
      else if (diasRestantes <= 30) estado = 'proximo';

      todosLosLotes.push({
        id: doc.id,
        productId: b.productId || '',
        productoNombre: productsMap.get(b.productId) || `Producto #${(b.productId || '').slice(-4)}`,
        batchNumber: b.batchNumber || undefined,
        expirationDate: b.expirationDate || new Date().toISOString().split('T')[0],
        quantity: Number(b.quantity) || 1,
        diasRestantes,
        estado,
      });
    });

    // Ordenar de menor a mayor días restantes (los más urgentes primero)
    todosLosLotes.sort((a, b) => a.diasRestantes - b.diasRestantes);

    const lotesVencidos = todosLosLotes.filter((l) => l.estado === 'vencido');
    const lotesCriticos = todosLosLotes.filter((l) => l.estado === 'critico');
    const lotesProximos = todosLosLotes.filter((l) => l.estado === 'proximo');

    // Memoria histórica JEV
    const historialMemoria = await obtenerAccionesJev({
      usuario: businessId,
      tipo: 'vencimientos',
      limite: 10,
    });

    const estadoOp = lotesVencidos.length > 0 || lotesCriticos.length > 0 ? 'atencion_requerida' : 'optimo';

    return {
      businessId,
      totalLotes: todosLosLotes.length,
      vencidosCount: lotesVencidos.length,
      criticosCount: lotesCriticos.length,
      proximosCount: lotesProximos.length,
      lotesVencidos,
      lotesCriticos,
      lotesProximos,
      todosLosLotes,
      historialMemoria,
      estado: estadoOp,
      ultimaActualizacion: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('[JEV CONTEXT VENCIMIENTOS] Error:', error);
    return {
      businessId,
      totalLotes: 0,
      vencidosCount: 0,
      criticosCount: 0,
      proximosCount: 0,
      lotesVencidos: [],
      lotesCriticos: [],
      lotesProximos: [],
      todosLosLotes: [],
      historialMemoria: [],
      estado: 'sin_datos',
      ultimaActualizacion: new Date().toISOString(),
    };
  }
}
