import { getAdminFirestore } from '@/firebase/server-init';
import type { TrackingCard, TrackingConfig, TrackingAnalyticsData, ChannelPerformance, TrackingTimelinePoint } from '../types-tracking';

const TRACKING_CONFIG_DOC = 'solicitud_tracking_config/main';
const TRACKING_CARDS_COLLECTION = 'solicitud_tracking_cards';
const TRACKING_VISITS_COLLECTION = 'solicitud_tracking_visits';
const SOLICITUDES_COLLECTION = 'solicitud_negocios';

// Palabras reservadas y rutas del router
export const RESERVED_WORDS = new Set([
  'directorio', 'superadmin', 'dashboard', 'blog', 'login', 'registro-negocio',
  'api', 'admin', 'contacto', 'contact', 'catalog', 'catalogo', 'pricing', 'aff',
  'negocio', 'politica-cobro', 'politica-de-privacidad', 'terminos', 'r', 'root',
  'auth', 'app', 'public', 'home', 'checkout', 'settings', 'configuracion'
]);

export function validateAliasOrCode(text: string): { valid: boolean; error?: string } {
  const clean = text.trim().toLowerCase();
  if (clean.length < 3 || clean.length > 30) {
    return { valid: false, error: 'Debe tener entre 3 y 30 caracteres.' };
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(clean)) {
    return { valid: false, error: 'Solo letras minúsculas, números y guiones (sin guion al inicio o final).' };
  }
  if (RESERVED_WORDS.has(clean)) {
    return { valid: false, error: 'Esta palabra está reservada por el sistema.' };
  }
  return { valid: true };
}

export async function getTrackingConfig(): Promise<TrackingConfig> {
  try {
    const db = await getAdminFirestore();
    const snap = await db.doc(TRACKING_CONFIG_DOC).get();
    if (!snap.exists) {
      return { customAlias: '', updatedAt: new Date().toISOString() };
    }
    return snap.data() as TrackingConfig;
  } catch (e) {
    return { customAlias: '', updatedAt: new Date().toISOString() };
  }
}

export async function saveTrackingAlias(alias: string): Promise<TrackingConfig> {
  const clean = alias.trim().toLowerCase();
  if (clean !== '') {
    const validation = validateAliasOrCode(clean);
    if (!validation.valid) throw new Error(validation.error);
  }

  const db = await getAdminFirestore();
  const updated: TrackingConfig = {
    customAlias: clean,
    updatedAt: new Date().toISOString()
  };
  await db.doc(TRACKING_CONFIG_DOC).set(updated, { merge: true });
  return updated;
}

export async function getTrackingCards(): Promise<TrackingCard[]> {
  const db = await getAdminFirestore();
  const snap = await db.collection(TRACKING_CARDS_COLLECTION).orderBy('createdAt', 'asc').get();
  return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
}

export async function saveTrackingCard(data: { id?: string; name: string; code: string; active?: boolean }): Promise<TrackingCard> {
  const db = await getAdminFirestore();
  const name = data.name.trim();
  const code = data.code.trim().toLowerCase();

  const validation = validateAliasOrCode(code);
  if (!validation.valid) throw new Error(validation.error);

  // Verificar que el código no esté repetido
  const existingSnap = await db.collection(TRACKING_CARDS_COLLECTION).where('code', '==', code).get();
  const duplicate = existingSnap.docs.find(doc => doc.id !== data.id);
  if (duplicate) {
    throw new Error('El código de canal ya está en uso por otra tarjeta.');
  }

  const cardRef = data.id 
    ? db.collection(TRACKING_CARDS_COLLECTION).doc(data.id)
    : db.collection(TRACKING_CARDS_COLLECTION).doc();

  const cardData: TrackingCard = {
    id: cardRef.id,
    name,
    code,
    active: data.active !== false,
    createdAt: new Date().toISOString()
  };

  await cardRef.set(cardData, { merge: true });
  return cardData;
}

export async function deleteTrackingCard(cardId: string): Promise<void> {
  const db = await getAdminFirestore();
  await db.collection(TRACKING_CARDS_COLLECTION).doc(cardId).delete();
}

export async function createDefaultSuggestedCards(): Promise<TrackingCard[]> {
  const defaultList = [
    { name: 'WhatsApp', code: 'whatsapp' },
    { name: 'Instagram', code: 'instagram' },
    { name: 'Facebook', code: 'facebook' },
    { name: 'TikTok', code: 'tiktok' },
    { name: 'QR Impreso', code: 'qr-impreso' }
  ];

  const created: TrackingCard[] = [];
  for (const item of defaultList) {
    try {
      const card = await saveTrackingCard(item);
      created.push(card);
    } catch (e) {}
  }
  return created;
}

// Registro anónimo de visita con deduplicación por sesión
export async function recordVisit(channelCode: string, sessionId: string): Promise<boolean> {
  try {
    if (!sessionId) return false;
    const db = await getAdminFirestore();
    const cleanCode = (channelCode || 'directo').trim().toLowerCase();

    // Deduplicación por día y sesión
    const todayStr = new Date().toISOString().split('T')[0];
    const visitDocId = `visit_${todayStr}_${cleanCode}_${sessionId.slice(0, 32)}`;

    const visitRef = db.collection(TRACKING_VISITS_COLLECTION).doc(visitDocId);
    const snap = await visitRef.get();
    if (snap.exists) {
      return false; // Ya registrada hoy en esta sesión
    }

    await visitRef.set({
      channelCode: cleanCode,
      date: todayStr,
      timestamp: new Date().toISOString()
    });
    return true;
  } catch (e) {
    console.error('Error registrando visita:', e);
    return false;
  }
}

// Cálculo de métricas y rendimiento
export async function getTrackingAnalytics(days = 30): Promise<TrackingAnalyticsData> {
  const db = await getAdminFirestore();
  const config = await getTrackingConfig();
  const cards = await getTrackingCards();

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const sinceStr = sinceDate.toISOString().split('T')[0];

  // 1. Obtener visitas en el rango
  const visitsSnap = await db.collection(TRACKING_VISITS_COLLECTION)
    .where('date', '>=', sinceStr)
    .get();

  const visitsByChannel: Record<string, number> = {};
  const visitsByDate: Record<string, number> = {};

  visitsSnap.forEach(d => {
    const data = d.data();
    const ch = data.channelCode || 'directo';
    visitsByChannel[ch] = (visitsByChannel[ch] || 0) + 1;
    visitsByDate[data.date] = (visitsByDate[data.date] || 0) + 1;
  });

  // 2. Obtener solicitudes en el rango
  const submissionsSnap = await db.collection(SOLICITUDES_COLLECTION)
    .where('createdAt', '>=', sinceDate.toISOString())
    .get();

  const submissionsByChannel: Record<string, number> = {};
  const confirmedPaymentsByChannel: Record<string, number> = {};
  const confirmedValueByChannel: Record<string, number> = {};
  const submissionsByDate: Record<string, number> = {};

  submissionsSnap.forEach(d => {
    const data = d.data();
    const rawCh = (data.referralChannel || 'directo').toLowerCase();
    submissionsByChannel[rawCh] = (submissionsByChannel[rawCh] || 0) + 1;

    const dateStr = (data.createdAt || '').split('T')[0];
    if (dateStr) {
      submissionsByDate[dateStr] = (submissionsByDate[dateStr] || 0) + 1;
    }

    if (data.paymentStatus === 'Pagado') {
      confirmedPaymentsByChannel[rawCh] = (confirmedPaymentsByChannel[rawCh] || 0) + 1;
      confirmedValueByChannel[rawCh] = (confirmedValueByChannel[rawCh] || 0) + (Number(data.planPrice) || 0);
    }
  });

  // 3. Armar filas de canales
  const channelsList: ChannelPerformance[] = [];
  const knownCodes = new Set<string>();

  cards.forEach(card => {
    const c = card.code.toLowerCase();
    knownCodes.add(c);
    const v = visitsByChannel[c] || 0;
    const s = submissionsByChannel[c] || 0;
    const rate = v > 0 ? Number(((s / v) * 100).toFixed(1)) : 0;
    const p = confirmedPaymentsByChannel[c] || 0;
    const val = confirmedValueByChannel[c] || 0;

    channelsList.push({
      channelCode: card.code,
      channelName: card.name,
      visits: v,
      submissions: s,
      conversionRate: rate,
      confirmedPayments: p,
      confirmedValueCOP: val
    });
  });

  // Canal Directo
  let directVisits = visitsByChannel['directo'] || 0;
  let directSubs = 0;
  let directConfirmedP = 0;
  let directConfirmedVal = 0;

  Object.entries(submissionsByChannel).forEach(([ch, count]) => {
    if (!knownCodes.has(ch)) {
      directSubs += count;
      directConfirmedP += (confirmedPaymentsByChannel[ch] || 0);
      directConfirmedVal += (confirmedValueByChannel[ch] || 0);
    }
  });

  channelsList.unshift({
    channelCode: 'directo',
    channelName: 'Directo (Sin referencia)',
    visits: directVisits,
    submissions: directSubs,
    conversionRate: directVisits > 0 ? Number(((directSubs / directVisits) * 100).toFixed(1)) : 0,
    confirmedPayments: directConfirmedP,
    confirmedValueCOP: directConfirmedVal
  });

  // 4. Totales
  let totalV = 0, totalS = 0, totalP = 0, totalVal = 0;
  channelsList.forEach(c => {
    totalV += c.visits;
    totalS += c.submissions;
    totalP += c.confirmedPayments;
    totalVal += c.confirmedValueCOP;
  });

  const totals = {
    visits: totalV,
    submissions: totalS,
    conversionRate: totalV > 0 ? Number(((totalS / totalV) * 100).toFixed(1)) : 0,
    confirmedPayments: totalP,
    confirmedValueCOP: totalVal
  };

  // 5. Timeline de fechas para el gráfico
  const timeline: TrackingTimelinePoint[] = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const str = d.toISOString().split('T')[0];
    timeline.push({
      date: str,
      visits: visitsByDate[str] || 0,
      submissions: submissionsByDate[str] || 0
    });
  }

  return { config, cards, performance: channelsList, timeline, totals };
}
