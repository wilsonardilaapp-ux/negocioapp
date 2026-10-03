'use server';

import { getAdminFirestore } from '@/firebase/server-init';
import { FieldValue } from 'firebase-admin/firestore';

export interface JevLimitsInfo {
  isModuleActive: boolean;
  baseLimit: number;
  extraLimit: number;
  totalReal: number;
  usageToday: number;
  canConsume: boolean;
  reason?: string;
}

function getTodayDateString(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export async function getJevCopilotLimitsInfo(businessId: string): Promise<JevLimitsInfo> {
  const db = await getAdminFirestore();
  const today = getTodayDateString();

  const businessRef = db.collection('businesses').doc(businessId);
  const businessSnap = await businessRef.get();
  const businessData = businessSnap.exists ? businessSnap.data() : null;

  const subSnap = await businessRef.collection('subscription').doc('current').get();
  const subData = subSnap.exists ? subSnap.data() : null;
  const planIdOrName = subData?.plan || businessData?.planName || '';

  let planData: any = null;
  if (planIdOrName) {
    const planSnap = await db.collection('hybrid_plans').doc(planIdOrName).get();
    if (planSnap.exists) {
      planData = planSnap.data();
    } else {
      const planQuery = await db.collection('hybrid_plans').where('name', '==', planIdOrName).limit(1).get();
      if (!planQuery.empty) {
        planData = planQuery.docs[0].data();
      }
    }
  }

  const moduleSnap = await businessRef.collection('modules').doc('jev-copiloto').get();
  const moduleData = moduleSnap.exists ? moduleSnap.data() : null;

  const planIncludesModule = Array.isArray(planData?.includedModuleKeys)
    ? planData.includedModuleKeys.includes('jev_copiloto')
    : false;

  let isModuleActive = false;
  if (moduleData) {
    isModuleActive = moduleData.status === 'active';
  } else {
    isModuleActive = planIncludesModule;
  }

  const planNameLower = (planData?.name || businessData?.planName || '').toLowerCase();
  if (planNameLower.includes('crecimiento') && !moduleData) {
    isModuleActive = false;
  }

  let baseLimit = 0;
  if (planData && Array.isArray(planData.extraLimits)) {
    const extraLimitItem = planData.extraLimits.find((item: any) => {
      const k = (item.key || '').toLowerCase();
      return k.includes('jev') || k.includes('copiloto');
    });
    if (extraLimitItem && typeof extraLimitItem.value === 'number') {
      baseLimit = extraLimitItem.value;
    }
  }

  const extraLimit = typeof moduleData?.extra === 'number' ? moduleData.extra : 0;
  const totalReal = Math.max(0, baseLimit + extraLimit);

  const usageDocId = businessId + '_' + today;
  const usageSnap = await db.collection('jev_copilot_usage').doc(usageDocId).get();
  const usageToday = usageSnap.exists ? (usageSnap.data()?.count || 0) : 0;

  const canConsume = isModuleActive && (totalReal > 0) && (usageToday < totalReal);

  return {
    isModuleActive,
    baseLimit,
    extraLimit,
    totalReal,
    usageToday,
    canConsume,
  };
}

export async function consumeJevCopilotCredit(businessId: string): Promise<void> {
  const db = await getAdminFirestore();
  const today = getTodayDateString();
  const usageDocId = businessId + '_' + today;

  const usageRef = db.collection('jev_copilot_usage').doc(usageDocId);

  await usageRef.set(
    {
      businessId,
      date: today,
      count: FieldValue.increment(1),
      lastUpdated: new Date().toISOString(),
    },
    { merge: true }
  );
}
