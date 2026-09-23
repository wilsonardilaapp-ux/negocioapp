import { InventoryBatch, BatchExpirationSummary, ExpirationStatus } from '@/models/inventory-expiration';

/**
 * Calcula la diferencia en días enteros entre hoy y una fecha de vencimiento dada.
 */
export function getDaysUntilExpiration(expirationDateStr: string, baseDate: Date = new Date()): number {
  const targetDate = new Date(expirationDateStr);
  const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const baseMidnight = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  
  const diffTime = targetMidnight.getTime() - baseMidnight.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Determina el estado de vencimiento según el número de días restantes.
 */
export function calculateExpirationStatus(daysRemaining: number, criticalThreshold = 7, warningThreshold = 30): ExpirationStatus {
  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= criticalThreshold) return 'critical';
  if (daysRemaining <= warningThreshold) return 'warning';
  return 'good';
}

/**
 * Filtra y categoriza los lotes que están vencidos o próximos a vencer dentro del rango indicado.
 */
export function getExpiringBatches(
  batches: InventoryBatch[],
  thresholdDays = 30,
  baseDate: Date = new Date()
): BatchExpirationSummary[] {
  return batches
    .map(batch => {
      const daysRemaining = getDaysUntilExpiration(batch.expirationDate, baseDate);
      const status = calculateExpirationStatus(daysRemaining, 7, thresholdDays);
      return { batch, daysRemaining, status };
    })
    .filter(summary => summary.status !== 'good')
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}
