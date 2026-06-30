/**
 * @fileOverview Definición del modelo de logs de capacidad extra.
 */

import { Timestamp } from 'firebase/firestore';

export interface ExtraCapacityLog {
  id?: string;
  businessId: string;
  businessName: string;
  amount: number;
  reason: 'referido_confirmado_referente' | 'referido_confirmado_referido' | 'ajuste_manual' | 'compra_directa';
  origin: 'automatico' | 'manual';
  adminId: string | null;
  notes: string | null;
  createdAt: Timestamp;
}
