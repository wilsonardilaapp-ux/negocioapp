/**
 * @fileOverview Definición del modelo de referidos.
 */

import { Timestamp } from 'firebase/firestore';

export type ReferralStatus = 'pending_payment' | 'paid_confirmed' | 'rejected';

export interface Referral {
  id: string;
  referentBusinessId: string;
  referreeBusinessId: string;
  referralCode: string;
  createdAt: Timestamp;
  status: ReferralStatus;
  paidConfirmedAt: Timestamp | null;
  referentRewardGranted: boolean;
  referreeRewardGranted: boolean;
  paymentRail: string | null;
  origin: 'automatico' | 'manual';
  adminResponsibleId: string | null;
  manualNote: string | null;
}
