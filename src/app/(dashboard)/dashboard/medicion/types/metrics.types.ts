/**
 * @fileOverview Definiciones de tipos para el módulo de medición analítica.
 */

export type TimeRange = '7d' | '30d' | '90d' | '12m';

export interface DataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface MetricAnalysis {
  title: string;
  currentValue: number;
  previousValue: number;
  growth: number;
  history: DataPoint[];
}
