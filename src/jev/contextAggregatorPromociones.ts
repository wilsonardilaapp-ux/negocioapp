import { getAdminFirestore } from '@/firebase/server-init';
import { obtenerAccionesJev } from './jevMemory';

export interface PromocionResumenJev {
  id: string;
  titulo: string;
  tipo: string;
  valorDescuento: number;
  isActive: boolean;
  usageCount: number;
  usageLimit?: number;
  validUntil: string;
  diasRestantes: number;
  esPorVencer: boolean; // <= 7 días
  esSinUso: boolean;    // activa con 0 usos
}

export interface ContextoPromociones {
  businessId: string;
  totalPromociones: number;
  activasCount: number;
  inactivasCount: number;
  sinUsoCount: number;
  porVencerCount: number;
  promocionMasExitosa?: PromocionResumenJev;
  todasLasPromociones: PromocionResumenJev[];
  historialMemoria: any[];
  estado: 'optimo' | 'atencion_requerida' | 'sin_datos';
  ultimaActualizacion: string;
}

/**
 * Agregador de contexto para Promociones (SOLO LECTURA).
 * Consulta la colección promotions sin modificar ningún registro.
 */
export async function getPromocionesContext(businessId: string): Promise<ContextoPromociones> {
  if (!businessId || typeof businessId !== 'string') {
    throw new Error('[JEV CONTEXT PROMOCIONES] businessId es obligatorio.');
  }

  const firestore = await getAdminFirestore();

  try {
    const promosSnap = await firestore
      .collection('promotions')
      .where('companyId', '==', businessId)
      .get();

    if (promosSnap.empty) {
      return {
        businessId,
        totalPromociones: 0,
        activasCount: 0,
        inactivasCount: 0,
        sinUsoCount: 0,
        porVencerCount: 0,
        todasLasPromociones: [],
        historialMemoria: [],
        estado: 'sin_datos',
        ultimaActualizacion: new Date().toISOString(),
      };
    }

    const ahora = new Date();
    const hoyMidnight = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();

    const todasLasPromociones: PromocionResumenJev[] = [];
    let activasCount = 0;
    let inactivasCount = 0;
    let sinUsoCount = 0;
    let porVencerCount = 0;

    promosSnap.forEach((doc) => {
      const p = doc.data();
      const isActive = p.isActive !== undefined ? !!p.isActive : true;
      const usageCount = Number(p.usageCount) || 0;
      const usageLimit = p.usageLimit ? Number(p.usageLimit) : undefined;

      const validUntilStr = p.validUntil || new Date(ahora.getTime() + 30 * 86400000).toISOString();
      const validUntilDate = new Date(validUntilStr);
      const diasRestantes = Math.round((validUntilDate.getTime() - hoyMidnight) / (1000 * 60 * 60 * 24));

      const esPorVencer = isActive && diasRestantes >= 0 && diasRestantes <= 7;
      const esSinUso = isActive && usageCount === 0;

      if (isActive) {
        activasCount++;
        if (esSinUso) sinUsoCount++;
        if (esPorVencer) porVencerCount++;
      } else {
        inactivasCount++;
      }

      todasLasPromociones.push({
        id: doc.id,
        titulo: p.title || 'Promoción',
        tipo: p.type || 'percentage',
        valorDescuento: Number(p.discountValue) || 0,
        isActive,
        usageCount,
        usageLimit,
        validUntil: validUntilStr,
        diasRestantes,
        esPorVencer,
        esSinUso,
      });
    });

    // Ordenar: primero las que tienen más redenciones
    todasLasPromociones.sort((a, b) => b.usageCount - a.usageCount);
    const promocionMasExitosa = todasLasPromociones.find((p) => p.isActive && p.usageCount > 0);

    // Memoria histórica JEV
    const historialMemoria = await obtenerAccionesJev({
      usuario: businessId,
      tipo: 'promociones',
      limite: 10,
    });

    const estadoOp = sinUsoCount > 0 || porVencerCount > 0 ? 'atencion_requerida' : 'optimo';

    return {
      businessId,
      totalPromociones: todasLasPromociones.length,
      activasCount,
      inactivasCount,
      sinUsoCount,
      porVencerCount,
      promocionMasExitosa,
      todasLasPromociones,
      historialMemoria,
      estado: estadoOp,
      ultimaActualizacion: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('[JEV CONTEXT PROMOCIONES] Error:', error);
    return {
      businessId,
      totalPromociones: 0,
      activasCount: 0,
      inactivasCount: 0,
      sinUsoCount: 0,
      porVencerCount: 0,
      todasLasPromociones: [],
      historialMemoria: [],
      estado: 'sin_datos',
      ultimaActualizacion: new Date().toISOString(),
    };
  }
}
