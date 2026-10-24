const fs = require('fs');
const path = require('path');

console.log('==============================================');
console.log('APLICANDO TRACKING PARTE 1: Backend & Rutas');
console.log('==============================================');

function backupAndWrite(filePath, content) {
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, filePath + '.bak');
    console.log('[BACKUP OK] ' + filePath + '.bak');
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[ACTUALIZADO OK] ' + filePath);
}

// 1. Crear directorios
const dirs = [
  'src/app/r/[alias]',
  'src/app/api/solicitudes-negocio/tracking/visit',
  'src/app/api/solicitudes-negocio/admin/tracking'
];
dirs.forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// 2. types-tracking.ts
const typesTrackingContent = `export interface TrackingCard {
  id: string;
  name: string;        // Nombre visible del canal (ej: "WhatsApp", "TikTok")
  code: string;        // Código en URL (ej: "whatsapp", "tiktok")
  active: boolean;     // Activo o inactivo
  createdAt: string;
  visitsCount?: number;
  submissionsCount?: number;
}

export interface TrackingConfig {
  customAlias: string;
  updatedAt: string;
}

export interface ChannelPerformance {
  channelCode: string;
  channelName: string;
  visits: number;
  submissions: number;
  conversionRate: number;      // Porcentaje (submissions / visits * 100)
  confirmedPayments: number;   // Cantidad de pagos confirmados
  confirmedValueCOP: number;   // Suma total en COP
}

export interface TrackingTimelinePoint {
  date: string;
  visits: number;
  submissions: number;
}

export interface TrackingAnalyticsData {
  config: TrackingConfig;
  cards: TrackingCard[];
  performance: ChannelPerformance[];
  timeline: TrackingTimelinePoint[];
  totals: {
    visits: number;
    submissions: number;
    conversionRate: number;
    confirmedPayments: number;
    confirmedValueCOP: number;
  };
}
`;
fs.writeFileSync('src/modules/solicitudes-negocio/types-tracking.ts', typesTrackingContent, 'utf8');
console.log('[OK] Creado: src/modules/solicitudes-negocio/types-tracking.ts');

// 3. solicitud-tracking-service.ts
const trackingServiceContent = `import { getAdminFirestore } from '@/firebase/server-init';
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
    const visitDocId = \`visit_\${todayStr}_\${cleanCode}_\${sessionId.slice(0, 32)}\`;

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
`;
fs.writeFileSync('src/modules/solicitudes-negocio/services/solicitud-tracking-service.ts', trackingServiceContent, 'utf8');
console.log('[OK] Creado: src/modules/solicitudes-negocio/services/solicitud-tracking-service.ts');

// 4. Redirección /r/[alias]
const rAliasPageContent = `import { redirect } from 'next/navigation';
import { getTrackingConfig } from '@/modules/solicitudes-negocio/services/solicitud-tracking-service';

export const dynamic = 'force-dynamic';

export default async function RedirectAliasPage({
  params,
  searchParams
}: {
  params: { alias: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { alias } = params;
  const config = await getTrackingConfig();

  const query = new URLSearchParams();
  Object.entries(searchParams || {}).forEach(([k, v]) => {
    if (typeof v === 'string') query.set(k, v);
  });

  const queryString = query.toString();
  const target = queryString ? \`/registro-negocio?\${queryString}\` : '/registro-negocio';

  // Si coincide con el alias configurado, redirigir
  if (config.customAlias && config.customAlias.toLowerCase() === alias.toLowerCase()) {
    redirect(target);
  }

  // Fallback por defecto a registro-negocio
  redirect(target);
}
`;
fs.writeFileSync('src/app/r/[alias]/page.tsx', rAliasPageContent, 'utf8');
console.log('[OK] Creado: src/app/r/[alias]/page.tsx');

// 5. API pública /api/solicitudes-negocio/tracking/visit
const visitApiContent = `import { NextRequest, NextResponse } from 'next/server';
import { recordVisit } from '@/modules/solicitudes-negocio/services/solicitud-tracking-service';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { channelCode, sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ success: false });
    }

    const recorded = await recordVisit(channelCode, sessionId);
    return NextResponse.json({ success: true, recorded });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
`;
fs.writeFileSync('src/app/api/solicitudes-negocio/tracking/visit/route.ts', visitApiContent, 'utf8');
console.log('[OK] Creado: src/app/api/solicitudes-negocio/tracking/visit/route.ts');

// 6. API Admin /api/solicitudes-negocio/admin/tracking
const adminTrackingApiContent = `import { NextRequest, NextResponse } from 'next/server';
import { 
  getTrackingAnalytics, 
  saveTrackingAlias, 
  saveTrackingCard, 
  deleteTrackingCard, 
  createDefaultSuggestedCards 
} from '@/modules/solicitudes-negocio/services/solicitud-tracking-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Number(searchParams.get('days')) || 30;
    const data = await getTrackingAnalytics(days);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error cargando métricas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'saveAlias') {
      const updated = await saveTrackingAlias(body.alias);
      return NextResponse.json({ success: true, config: updated, message: 'Alias actualizado con éxito.' });
    }

    if (body.action === 'saveCard') {
      const card = await saveTrackingCard(body.card);
      return NextResponse.json({ success: true, card, message: 'Tarjeta de seguimiento guardada.' });
    }

    if (body.action === 'deleteCard') {
      await deleteTrackingCard(body.cardId);
      return NextResponse.json({ success: true, message: 'Tarjeta eliminada.' });
    }

    if (body.action === 'createDefaults') {
      const created = await createDefaultSuggestedCards();
      return NextResponse.json({ success: true, cards: created, message: 'Tarjetas sugeridas creadas.' });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error en operación' }, { status: 500 });
  }
}
`;
fs.writeFileSync('src/app/api/solicitudes-negocio/admin/tracking/route.ts', adminTrackingApiContent, 'utf8');
console.log('[OK] Creado: src/app/api/solicitudes-negocio/admin/tracking/route.ts');

// 7. Modificar solicitudes-service.ts y route.ts para guardar referralChannel
const servicePath = 'src/modules/solicitudes-negocio/services/solicitudes-service.ts';
let serviceCode = fs.readFileSync(servicePath, 'utf8');

if (!serviceCode.includes('referralChannel?: string;')) {
  serviceCode = serviceCode.replace(
    'paymentReceiptUrl?: string;\n  customFieldsData?: any;',
    'paymentReceiptUrl?: string;\n  referralChannel?: string;\n  customFieldsData?: any;'
  );
  serviceCode = serviceCode.replace(
    'paymentReceiptUrl: data.paymentReceiptUrl || \'\',\n    paymentStatus,',
    'paymentReceiptUrl: data.paymentReceiptUrl || \'\',\n    paymentStatus,\n    referralChannel: data.referralChannel || \'Directo\','
  );
  serviceCode = serviceCode.replace(
    'plantilla = plantilla.replace(/{comprobante}/g, comprobanteStr);',
    'plantilla = plantilla.replace(/{comprobante}/g, comprobanteStr);\n  plantilla = plantilla.replace(/{canal}/g, data.referralChannel || \'Directo\');'
  );
  backupAndWrite(servicePath, serviceCode);
}

// 8. route.ts
const routePath = 'src/app/api/solicitudes-negocio/route.ts';
let routeCode = fs.readFileSync(routePath, 'utf8');
if (!routeCode.includes('referralChannel')) {
  routeCode = routeCode.replace(
    "const paymentReference = String(formData.get('paymentReference') || '').trim();",
    "const paymentReference = String(formData.get('paymentReference') || '').trim();\n    const referralChannel = String(formData.get('referralChannel') || 'Directo').trim();"
  );
  routeCode = routeCode.replace(
    'paymentReceiptUrl,',
    'paymentReceiptUrl,\n      referralChannel,'
  );
  backupAndWrite(routePath, routeCode);
}

console.log('==============================================');
console.log('TRACKING PARTE 1 APLICADA CON ÉXITO');
console.log('==============================================');
