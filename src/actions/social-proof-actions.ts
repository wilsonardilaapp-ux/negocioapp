'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import type { SocialProofProductMetrics, SocialProofCatalogMetrics } from '@/models/social-proof';

/**
 * Función pseudoaleatoria determinística por bloque de tiempo (30 min)
 */
function getDeterministicViewers(productId: string, timeBlock: number): number {
  let hash = 0;
  const str = `${productId}-${timeBlock}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const min = 3;
  const max = 18;
  return min + (Math.abs(hash) % (max - min + 1));
}

/**
 * Obtiene métricas seguras de prueba social para el catálogo público sin exponer pedidos
 */
export async function getSocialProofMetrics(businessId: string): Promise<SocialProofCatalogMetrics> {
  const emptyResult: SocialProofCatalogMetrics = {
    businessId,
    isAuthorized: false,
    isEnabledByOwner: false,
    metrics: {}
  };

  try {
    const firestore = await getAdminFirestore();

    // 1. Verificar si el negocio existe y el estado del módulo
    const businessDoc = await firestore.collection('businesses').doc(businessId).get();
    if (!businessDoc.exists) return emptyResult;

    const businessData = businessDoc.data() || {};
    const isOwnerEnabled = businessData.socialProofEnabled !== false; // Default: true si el módulo está habilitado

    // 2. Verificar autorización de suscripción / módulos activos
    let isAuthorized = false;
    const subDoc = await firestore.collection('subscriptions').doc(businessId).get();
    if (subDoc.exists) {
      const activeModules: string[] = subDoc.data()?.activeModules || [];
      if (activeModules.includes('social-proof')) isAuthorized = true;
    }

    // Fallback: verificar en colección modules general
    if (!isAuthorized) {
      const globalMod = await firestore.collection('modules').doc('social-proof').get();
      if (globalMod.exists && globalMod.data()?.status === 'active') {
        // Si no hay restricción granular en suscripción, se considera activo
        isAuthorized = true;
      }
    }

    if (!isAuthorized || !isOwnerEnabled) {
      return {
        businessId,
        isAuthorized,
        isEnabledByOwner: isOwnerEnabled,
        metrics: {}
      };
    }

    // 3. Consultar pedidos reales (últimos 7 días)
    const now = Date.now();
    const twelveHoursAgo = new Date(now - 12 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const current30MinBlock = Math.floor(now / (30 * 60 * 1000));

    // Consultar pedidos del negocio en subcolección o colección principal
    let ordersSnapshot;
    const subColOrders = await firestore.collection('businesses').doc(businessId).collection('orders')
      .where('orderDate', '>=', sevenDaysAgo)
      .get();

    if (!subColOrders.empty) {
      ordersSnapshot = subColOrders;
    } else {
      ordersSnapshot = await firestore.collection('orders')
        .where('businessId', '==', businessId)
        .where('orderDate', '>=', sevenDaysAgo)
        .get();
    }

    // Calcular ventas por producto
    const sales12hMap = new Map<string, number>();
    const sales7dMap = new Map<string, number>();

    ordersSnapshot.forEach(docSnap => {
      const order = docSnap.data();
      if (order.orderStatus === 'Cancelado') return;
      const orderDate = order.orderDate || '';

      const is12h = orderDate >= twelveHoursAgo;
      const items = Array.isArray(order.items) ? order.items : [];

      items.forEach((item: any) => {
        if (!item?.productId) return;
        const qty = Number(item.quantity) || 1;
        sales7dMap.set(item.productId, (sales7dMap.get(item.productId) || 0) + qty);
        if (is12h) {
          sales12hMap.set(item.productId, (sales12hMap.get(item.productId) || 0) + qty);
        }
      });
    });

    // 4. Construir métricas evaluando productos
    const metrics: Record<string, SocialProofProductMetrics> = {};
    const productsSnap = await firestore.collection('businesses').doc(businessId).collection('products').get();

    productsSnap.forEach(prodDoc => {
      const prod = prodDoc.data();
      const prodId = prodDoc.id;
      const s12h = sales12hMap.get(prodId) || 0;
      const s7d = sales7dMap.get(prodId) || 0;

      // Reglas:
      // 🔥 vendidos: switch producto !== false + s12h >= 3
      const showSales = (prod.socialProofRecentSales !== false) && (s12h >= 3);

      // 👀 mirando: switch producto !== false + s7d >= 1
      const showViewers = (prod.socialProofLiveViewers !== false) && (s7d >= 1);
      const viewers = showViewers ? getDeterministicViewers(prodId, current30MinBlock) : 0;

      if (showSales || showViewers) {
        metrics[prodId] = {
          productId: prodId,
          salesLast12Hours: s12h,
          salesLast7Days: s7d,
          liveViewers: viewers,
          showRecentSales: showSales,
          showLiveViewers: showViewers,
        };
      }
    });

    return {
      businessId,
      isAuthorized: true,
      isEnabledByOwner: true,
      metrics,
    };
  } catch (error) {
    console.error('Error calculando social proof metrics:', error);
    return emptyResult;
  }
}
