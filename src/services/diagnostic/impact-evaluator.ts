
'use client';

/**
 * @fileOverview Motor de evaluación de impacto para acciones aplicadas en el diagnóstico.
 * Compara el baseline histórico con los datos extraídos en tiempo real.
 */

import { getFirestore, collection, query, where, getDocs, doc, writeBatch, Timestamp } from 'firebase/firestore';
import type { DiagnosticRawData } from './data-extractor';

export type ImpactStatus = 'improved' | 'stable' | 'declined' | 'too_early';

export interface ActionTracking {
  id: string;
  reportId: string;
  pilar: string;
  description: string;
  status: 'pending' | 'applied' | 'dismissed';
  appliedAt: string;
  baselineValue: number;
  targetMetricKey: string;
  resultValue: number | null;
  impactStatus: ImpactStatus | null;
  lastEvaluatedAt?: string;
}

/**
 * Evalúa todas las acciones aplicadas de un negocio contra los datos actuales.
 * Actualiza la subcolección diagnosticActions.
 */
export async function evaluateAppliedActionsImpact(businessId: string, currentRaw: DiagnosticRawData) {
  const db = getFirestore();
  const actionsRef = collection(db, `businesses/${businessId}/diagnosticActions`);
  const q = query(actionsRef, where('status', '==', 'applied'));
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) return [];

  const batch = writeBatch(db);
  const results: ActionTracking[] = [];
  const now = new Date();

  for (const actionDoc of snapshot.docs) {
    const action = { id: actionDoc.id, ...actionDoc.data() } as ActionTracking;
    const appliedDate = new Date(action.appliedAt);
    const diffDays = (now.getTime() - appliedDate.getTime()) / (1000 * 3600 * 24);

    let currentValue: number | null = null;
    
    // Mapeo seguro de métricas actuales
    switch (action.pilar) {
      case 'ventaProactiva':
        currentValue = typeof currentRaw.ronda1_ventas.totalSales30d === 'number' ? currentRaw.ronda1_ventas.totalSales30d : null;
        break;
      case 'radarChurn':
        currentValue = typeof currentRaw.ronda2_clientes.churnRiskCount === 'number' ? currentRaw.ronda2_clientes.churnRiskCount : null;
        break;
      case 'reputacion':
        currentValue = typeof currentRaw.ronda4_motores.directoryRating === 'number' ? currentRaw.ronda4_motores.directoryRating : null;
        break;
      case 'operacionBlindada':
        currentValue = typeof currentRaw.ronda3_operacion.pendingOrdersCount === 'number' ? currentRaw.ronda3_operacion.pendingOrdersCount : null;
        break;
    }

    if (currentValue === null) continue;

    let status: ImpactStatus = 'stable';
    
    // Ventana mínima de 7 días para medición real
    if (diffDays < 7) {
      status = 'too_early';
    } else {
      const baseline = Number(action.baselineValue);
      
      // Lógica de mejora varía según el pilar (Ventas/Rating UP vs Churn/Pendientes DOWN)
      const isPositiveMetric = ['ventaProactiva', 'reputacion'].includes(action.pilar);
      
      if (isPositiveMetric) {
        if (currentValue > baseline) status = 'improved';
        else if (currentValue < baseline) status = 'declined';
      } else {
        if (currentValue < baseline) status = 'improved';
        else if (currentValue > baseline) status = 'declined';
      }
    }

    const updates = {
      resultValue: currentValue,
      impactStatus: status,
      lastEvaluatedAt: now.toISOString()
    };

    batch.update(actionDoc.ref, updates);
    results.push({ ...action, ...updates });
  }

  await batch.commit();
  return results;
}
