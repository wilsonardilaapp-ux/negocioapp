/**
 * @fileOverview Definición del modelo de configuración del programa de afiliados.
 */

export interface AffiliateConfig {
  programName: string;
  rewardReferent: number;
  rewardReferree: number;
  maxReferralsPerUser: number | null;
  isActive: boolean;
}
