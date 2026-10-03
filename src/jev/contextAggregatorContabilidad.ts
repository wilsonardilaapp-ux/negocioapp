import { getAdminFirestore } from '@/firebase/server-init';
import { obtenerAccionesJev } from './jevMemory';

export interface AsientoResumenJev {
  id: string;
  fecha: string;
  concepto: string;
  totalDebitos: number;
  totalCreditos: number;
  estaCuadrado: boolean;
  documentoReferencia?: string;
}

export interface ContextoContabilidad {
  businessId: string;
  totalAsientosMes: number;
  totalDebitosMes: number;
  totalCreditosMes: number;
  balanceNetoMes: number;
  asientosDescuadrados: AsientoResumenJev[];
  asientosSinReferencia: AsientoResumenJev[];
  asientosRecientes: AsientoResumenJev[];
  historialMemoria: any[];
  estado: 'optimo' | 'atencion_requerida' | 'sin_datos';
  ultimaActualizacion: string;
}

/**
 * Agregador de contexto para Contabilidad (SOLO LECTURA).
 * Consulta la subcolección businesses/{id}/asientos sin modificar ningún dato.
 */
export async function getContabilidadContext(businessId: string): Promise<ContextoContabilidad> {
  if (!businessId || typeof businessId !== 'string') {
    throw new Error('[JEV CONTEXT CONTABILIDAD] businessId es obligatorio.');
  }

  const firestore = await getAdminFirestore();

  try {
    const snap = await firestore
      .collection(`businesses/${businessId}/asientos`)
      .orderBy('fecha', 'desc')
      .limit(100)
      .get();

    if (snap.empty) {
      return {
        businessId,
        totalAsientosMes: 0,
        totalDebitosMes: 0,
        totalCreditosMes: 0,
        balanceNetoMes: 0,
        asientosDescuadrados: [],
        asientosSinReferencia: [],
        asientosRecientes: [],
        historialMemoria: [],
        estado: 'sin_datos',
        ultimaActualizacion: new Date().toISOString(),
      };
    }

    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();

    const asientosRecientes: AsientoResumenJev[] = [];
    const asientosDescuadrados: AsientoResumenJev[] = [];
    const asientosSinReferencia: AsientoResumenJev[] = [];

    let totalDebitosMes = 0;
    let totalCreditosMes = 0;
    let totalAsientosMes = 0;

    snap.forEach((doc) => {
      const d = doc.data();
      const fecha = d.fecha ? new Date(d.fecha) : new Date();
      const totalDebitos = Number(d.totalDebitos) || 0;
      const totalCreditos = Number(d.totalCreditos) || 0;
      const estaCuadrado = d.estaCuadrado !== undefined ? !!d.estaCuadrado : totalDebitos === totalCreditos;

      const item: AsientoResumenJev = {
        id: doc.id,
        fecha: d.fecha || new Date().toISOString(),
        concepto: d.concepto || 'Sin concepto registrado',
        totalDebitos,
        totalCreditos,
        estaCuadrado,
        documentoReferencia: d.documentoReferencia || undefined,
      };

      asientosRecientes.push(item);

      // Descuadrados
      if (!estaCuadrado) {
        asientosDescuadrados.push(item);
      }

      // Sin referencia
      if (!d.documentoReferencia || !d.documentoReferencia.trim()) {
        asientosSinReferencia.push(item);
      }

      // Acumular métricas del mes en curso
      if (fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual) {
        totalAsientosMes++;
        totalDebitosMes += totalDebitos;
        totalCreditosMes += totalCreditos;
      }
    });

    const balanceNetoMes = totalDebitosMes - totalCreditosMes;

    // Memoria histórica JEV
    const historialMemoria = await obtenerAccionesJev({
      usuario: businessId,
      tipo: 'contabilidad',
      limite: 10,
    });

    const estado = asientosDescuadrados.length > 0 ? 'atencion_requerida' : 'optimo';

    return {
      businessId,
      totalAsientosMes,
      totalDebitosMes,
      totalCreditosMes,
      balanceNetoMes,
      asientosDescuadrados,
      asientosSinReferencia,
      asientosRecientes,
      historialMemoria,
      estado,
      ultimaActualizacion: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('[JEV CONTEXT CONTABILIDAD] Error:', error);
    return {
      businessId,
      totalAsientosMes: 0,
      totalDebitosMes: 0,
      totalCreditosMes: 0,
      balanceNetoMes: 0,
      asientosDescuadrados: [],
      asientosSinReferencia: [],
      asientosRecientes: [],
      historialMemoria: [],
      estado: 'sin_datos',
      ultimaActualizacion: new Date().toISOString(),
    };
  }
}
