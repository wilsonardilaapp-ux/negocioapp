/**
 * Modelo y tipos de configuración para el módulo de Prueba Social en Markix.
 */

export interface ProductSocialProofConfig {
  socialProofRecentSales?: boolean; // Default true: Mostrar 🔥 X vendidos en 12h si >= 3
  socialProofLiveViewers?: boolean; // Default true: Mostrar �� X mirando si >= 1 venta en 7d
}

export interface BusinessSocialProofConfig {
  socialProofEnabled?: boolean; // Switch global del dueño para el catálogo público
}

export interface SocialProofProductMetrics {
  productId: string;
  salesLast12Hours: number;
  salesLast7Days: number;
  liveViewers: number;
  showRecentSales: boolean;
  showLiveViewers: boolean;
}

export interface SocialProofCatalogMetrics {
  businessId: string;
  isAuthorized: boolean;
  isEnabledByOwner: boolean;
  metrics: Record<string, SocialProofProductMetrics>;
}
