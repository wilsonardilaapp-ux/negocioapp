import { getAdminFirestore } from '@/firebase/server-init';
import { getVipRanking, getChurnStatistics, getRecoveryStats } from '@/actions/loyalty';
import { obtenerAccionesJev } from './jevMemory';

export interface ContextoLoyalty {
  businessId: string;
  vipCustomers: any[];
  churnCustomers: any[];
  totalChurnCount: number;
  recoveredRevenue: number;
  recoveredCount: number;
  recentReviews: any[];
  promedioCalificacion: number;
  puntosConfig: {
    pointsPerCurrencyUnit: number;
    currencyValuePerPoint: number;
  };
  historialMemoria: any[];
  ultimaActualizacion: string;
}

/**
 * Agregador de contexto para Fidelización e Inteligencia (SOLO LECTURA).
 */
export async function getLoyaltyContext(businessId: string): Promise<ContextoLoyalty> {
  if (!businessId || typeof businessId !== 'string') {
    throw new Error('[JEV CONTEXT LOYALTY] businessId es obligatorio.');
  }

  const db = await getAdminFirestore();

  // 1. Obtener datos en paralelo desde las actions existentes de loyalty
  const [vipRanking, churnStats, recoveryStats] = await Promise.all([
    getVipRanking(businessId).catch(() => []),
    getChurnStatistics(businessId).catch(() => ({ customers: [], totalCount: 0 })),
    getRecoveryStats(businessId).catch(() => ({ totalRevenue: 0, recoveredCount: 0 })),
  ]);

  // 2. Obtener configuración de puntos desde Firestore
  let puntosConfig = { pointsPerCurrencyUnit: 1, currencyValuePerPoint: 0.05 };
  try {
    const configSnap = await db.collection('businesses').doc(businessId).collection('loyalty_config').doc('main').get();
    if (configSnap.exists) {
      const data = configSnap.data();
      if (data?.pointsPerCurrencyUnit !== undefined) puntosConfig.pointsPerCurrencyUnit = data.pointsPerCurrencyUnit;
      if (data?.currencyValuePerPoint !== undefined) puntosConfig.currencyValuePerPoint = data.currencyValuePerPoint;
    }
  } catch (e) {}

  // 3. Obtener últimas reseñas
  let recentReviews: any[] = [];
  let promedioCalificacion = 5.0;
  try {
    const reviewsSnap = await db.collection('reviews')
      .where('businessId', '==', businessId)
      .limit(15)
      .get();
    
    if (!reviewsSnap.empty) {
      recentReviews = reviewsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const ratings = recentReviews.map(r => Number(r.rating) || 5);
      promedioCalificacion = ratings.length > 0 
        ? parseFloat((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1))
        : 5.0;
    }
  } catch (e) {}

  // 4. Memoria JEV
  let historialMemoria: any[] = [];
  try {
    historialMemoria = await obtenerAccionesJev({
      usuario: businessId,
      tipo: 'retencion',
      limite: 15,
    });
  } catch (e) {}

  return {
    businessId,
    vipCustomers: vipRanking,
    churnCustomers: churnStats.customers || [],
    totalChurnCount: churnStats.totalCount || 0,
    recoveredRevenue: recoveryStats.totalRevenue || 0,
    recoveredCount: (recoveryStats as any)?.count || (recoveryStats as any)?.recoveredCount || 0,
    recentReviews,
    promedioCalificacion,
    puntosConfig,
    historialMemoria,
    ultimaActualizacion: new Date().toISOString(),
  };
}
