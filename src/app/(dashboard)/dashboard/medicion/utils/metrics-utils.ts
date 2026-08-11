/**
 * @fileOverview Utilidades matemáticas para el cálculo de indicadores.
 */

import { format, subDays, startOfDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Calcula el porcentaje de crecimiento entre dos valores.
 */
export const calculateGrowth = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

/**
 * Genera un intervalo de fechas para filtrado.
 */
export const getDateInterval = (days: number) => {
  const end = new Date();
  const start = startOfDay(subDays(end, days));
  return { start, end };
};

/**
 * Formatea un valor numérico a moneda COP.
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};
