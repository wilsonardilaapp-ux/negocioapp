import { getAdminFirestore } from '@/firebase/server-init';
import { obtenerAccionesJev } from './jevMemory';

export interface ReglaSugerenciaJev {
  id: string;
  triggerProductId: string;
  suggestedProductId: string;
  active: boolean;
  shownCount: number;
  acceptedCount: number;
  revenueAttributed: number;
  tasaConversion: number;
  esSinResultados: boolean;
}

export interface ContextoSuggestions {
  businessId: string;
  totalReglas: number;
  activasCount: number;
  inactivasCount: number;
  totalMostradas: number;
  totalAceptadas: number;
  tasaConversionGlobal: number;
  ingresosAtribuidosTotal: number;
  reglasSinResultadosCount: number;
  reglas: ReglaSugerenciaJev[];
  historialMemoria: any[];
  estado: 'optimo' | 'atencion_requerida' | 'sin_datos';
  ultimaActualizacion: string;
}

/**
 * Agregador de contexto para Sugerencias Inteligentes (SOLO LECTURA).
 * Consulta la colección suggestionRules sin modificar ningún dato.
 */
export async function getSuggestionsContext(businessId: string): Promise<ContextoSuggestions> {
  if (!businessId || typeof businessId !== 'string') {
    throw new Error('[JEV CONTEXT SUGGESTIONS] businessId es obligatorio.');
  }

  const firestore = await getAdminFirestore();

  try {
    const rulesSnap = await firestore
      .collection(`businesses/${businessId}/suggestionRules`)
      .get();

    if (rulesSnap.empty) {
      return {
        businessId,
        totalReglas: 0,
        activasCount: 0,
        inactivasCount: 0,
        totalMostradas: 0,
        totalAceptadas: 0,
        tasaConversionGlobal: 0,
        ingresosAtribuidosTotal: 0,
        reglasSinResultadosCount: 0,
        reglas: [],
        historialMemoria: [],
        estado: 'sin_datos',
        ultimaActualizacion: new Date().toISOString(),
      };
    }

    const reglas: ReglaSugerenciaJev[] = [];
    let activasCount = 0;
    let inactivasCount = 0;
    let totalMostradas = 0;
    let totalAceptadas = 0;
    let ingresosAtribuidosTotal = 0;
    let reglasSinResultadosCount = 0;

    rulesSnap.forEach((doc) => {
      const r = doc.data();
      const active = r.active !== undefined ? !!r.active : true;
      const shownCount = Number(r.shownCount) || 0;
      const acceptedCount = Number(r.acceptedCount) || 0;
      const revenueAttributed = Number(r.revenueAttributed) || 0;

      totalMostradas += shownCount;
      totalAceptadas += acceptedCount;
      ingresosAtribuidosTotal += revenueAttributed;

      const tasaConversion = shownCount > 0 ? Math.round((acceptedCount / shownCount) * 100) : 0;
      const esSinResultados = active && shownCount > 5 && acceptedCount === 0;

      if (active) {
        activasCount++;
        if (esSinResultados) reglasSinResultadosCount++;
      } else {
        inactivasCount++;
      }

      reglas.push({
        id: doc.id,
        triggerProductId: r.triggerProductId || '',
        suggestedProductId: r.suggestedProductId || '',
        active,
        shownCount,
        acceptedCount,
        revenueAttributed,
        tasaConversion,
        esSinResultados,
      });
    });

    // Ordenar por ingresos atribuibles y conversión
    reglas.sort((a, b) => b.revenueAttributed - a.revenueAttributed || b.tasaConversion - a.tasaConversion);

    const tasaConversionGlobal = totalMostradas > 0 ? Math.round((totalAceptadas / totalMostradas) * 100) : 0;

    // Memoria histórica JEV
    const historialMemoria = await obtenerAccionesJev({
      usuario: businessId,
      tipo: 'sugerencias',
      limite: 10,
    });

    const estado = reglasSinResultadosCount > 0 || (activasCount === 0 && reglas.length > 0) ? 'atencion_requerida' : 'optimo';

    return {
      businessId,
      totalReglas: reglas.length,
      activasCount,
      inactivasCount,
      totalMostradas,
      totalAceptadas,
      tasaConversionGlobal,
      ingresosAtribuidosTotal,
      reglasSinResultadosCount,
      reglas,
      historialMemoria,
      estado,
      ultimaActualizacion: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('[JEV CONTEXT SUGGESTIONS] Error:', error);
    return {
      businessId,
      totalReglas: 0,
      activasCount: 0,
      inactivasCount: 0,
      totalMostradas: 0,
      totalAceptadas: 0,
      tasaConversionGlobal: 0,
      ingresosAtribuidosTotal: 0,
      reglasSinResultadosCount: 0,
      reglas: [],
      historialMemoria: [],
      estado: 'sin_datos',
      ultimaActualizacion: new Date().toISOString(),
    };
  }
}
