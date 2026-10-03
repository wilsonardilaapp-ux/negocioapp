import { getAdminFirestore } from '@/firebase/server-init';
import { obtenerAccionesJev } from './jevMemory';

export interface CuponResumenJev {
  id: string;
  codigo: string;
  tipo: 'porcentaje' | 'valorFijo';
  valor: number;
  fechaVencimiento: string;
  diasRestantes: number;
  limiteUsos: number;
  usosActuales: number;
  activo: boolean;
  esExpirado: boolean;
  esAgotado: boolean;
}

export interface ContextoCupones {
  businessId: string;
  totalCupones: number;
  activosCount: number;
  inactivosCount: number;
  expiradosCount: number;
  agotadosCount: number;
  totalUsosGeneral: number;
  cuponMasPopular?: CuponResumenJev;
  todosLosCupones: CuponResumenJev[];
  historialMemoria: any[];
  estado: 'optimo' | 'atencion_requerida' | 'sin_datos';
  ultimaActualizacion: string;
}

/**
 * Agregador de contexto para Cupones de Descuento (SOLO LECTURA).
 * Consulta la colección cupones sin modificar ningún dato.
 */
export async function getCuponesContext(businessId: string): Promise<ContextoCupones> {
  if (!businessId || typeof businessId !== 'string') {
    throw new Error('[JEV CONTEXT CUPONES] businessId es obligatorio.');
  }

  const firestore = await getAdminFirestore();

  try {
    const cuponesSnap = await firestore
      .collection('cupones')
      .where('businessId', '==', businessId)
      .get();

    if (cuponesSnap.empty) {
      return {
        businessId,
        totalCupones: 0,
        activosCount: 0,
        inactivosCount: 0,
        expiradosCount: 0,
        agotadosCount: 0,
        totalUsosGeneral: 0,
        todosLosCupones: [],
        historialMemoria: [],
        estado: 'sin_datos',
        ultimaActualizacion: new Date().toISOString(),
      };
    }

    const ahora = new Date();
    const hoyMidnight = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();

    const todosLosCupones: CuponResumenJev[] = [];
    let activosCount = 0;
    let inactivosCount = 0;
    let expiradosCount = 0;
    let agotadosCount = 0;
    let totalUsosGeneral = 0;

    cuponesSnap.forEach((doc) => {
      const c = doc.data();
      const activo = c.activo !== undefined ? !!c.activo : true;
      const usosActuales = Number(c.usosActuales) || 0;
      const limiteUsos = Number(c.limiteUsos) || 0;
      totalUsosGeneral += usosActuales;

      const vencimientoStr = c.fechaVencimiento || new Date(ahora.getTime() + 30 * 86400000).toISOString();
      const vencimientoDate = new Date(vencimientoStr);
      const diasRestantes = Math.round((vencimientoDate.getTime() - hoyMidnight) / (1000 * 60 * 60 * 24));

      const esExpirado = activo && diasRestantes < 0;
      const esAgotado = activo && limiteUsos > 0 && usosActuales >= limiteUsos;

      if (activo) {
        activosCount++;
        if (esExpirado) expiradosCount++;
        if (esAgotado) agotadosCount++;
      } else {
        inactivosCount++;
      }

      todosLosCupones.push({
        id: doc.id,
        codigo: c.codigo || 'CUPON',
        tipo: c.tipo || 'porcentaje',
        valor: Number(c.valor) || 0,
        fechaVencimiento: vencimientoStr,
        diasRestantes,
        limiteUsos,
        usosActuales,
        activo,
        esExpirado,
        esAgotado,
      });
    });

    // Ordenar: primero los más redimidos
    todosLosCupones.sort((a, b) => b.usosActuales - a.usosActuales);
    const cuponMasPopular = todosLosCupones.find((c) => c.activo && c.usosActuales > 0);

    // Memoria histórica JEV
    const historialMemoria = await obtenerAccionesJev({
      usuario: businessId,
      tipo: 'cupones',
      limite: 10,
    });

    const estadoOp = expiradosCount > 0 || agotadosCount > 0 ? 'atencion_requerida' : 'optimo';

    return {
      businessId,
      totalCupones: todosLosCupones.length,
      activosCount,
      inactivosCount,
      expiradosCount,
      agotadosCount,
      totalUsosGeneral,
      cuponMasPopular,
      todosLosCupones,
      historialMemoria,
      estado: estadoOp,
      ultimaActualizacion: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('[JEV CONTEXT CUPONES] Error:', error);
    return {
      businessId,
      totalCupones: 0,
      activosCount: 0,
      inactivosCount: 0,
      expiradosCount: 0,
      agotadosCount: 0,
      totalUsosGeneral: 0,
      todosLosCupones: [],
      historialMemoria: [],
      estado: 'sin_datos',
      ultimaActualizacion: new Date().toISOString(),
    };
  }
}
