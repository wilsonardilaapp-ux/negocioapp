const fs = require('fs');
const path = require('path');

console.log("🚀 Iniciando FASE 3: Implementación del Contador de Consumo y Límites...");

// ==========================================
// 1. CREAR ARCHIVO AISLADO jevLimitsService.ts
// ==========================================
const servicePath = path.join(process.cwd(), 'src/jev/jevLimitsService.ts');
const serviceContent = `'use server';

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

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD
 */
function getTodayDateString(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

/**
 * Consulta en tiempo real el plan activo del negocio, toggle del módulo y calcula:
 * TOTAL REAL = LÍMITE BASE + EXTRA(+)
 */
export async function getJevCopilotLimitsInfo(businessId: string): Promise<JevLimitsInfo> {
  const db = await getAdminFirestore();
  const today = getTodayDateString();

  // 1. Consultar documento del negocio
  const businessRef = db.collection('businesses').doc(businessId);
  const businessSnap = await businessRef.get();
  const businessData = businessSnap.exists ? businessSnap.data() : null;

  // 2. Consultar suscripción y plan activo
  const subSnap = await businessRef.collection('subscription').doc('current').get();
  const subData = subSnap.exists ? subSnap.data() : null;
  const planIdOrName = subData?.plan || businessData?.planName || '';

  // Buscar el plan en hybrid_plans
  let planData: any = null;
  if (planIdOrName) {
    const planSnap = await db.collection('hybrid_plans').doc(planIdOrName).get();
    if (planSnap.exists) {
      planData = planSnap.data();
    } else {
      // Buscar por nombre si no coincidió el id
      const planQuery = await db.collection('hybrid_plans').where('name', '==', planIdOrName).limit(1).get();
      if (!planQuery.empty) {
        planData = planQuery.docs[0].data();
      }
    }
  }

  // 3. Consultar estado del módulo para este negocio
  const moduleSnap = await businessRef.collection('modules').doc('jev_copiloto').get();
  const moduleData = moduleSnap.exists ? moduleSnap.data() : null;

  // Evaluar si el módulo está incluido por plan
  const planIncludesModule = Array.isArray(planData?.includedModuleKeys)
    ? planData.includedModuleKeys.includes('jev_copiloto')
    : false;

  // El toggle está activo si explícitamente está 'active' en el negocio, o si está incluido en el plan y no fue desactivado
  let isModuleActive = false;
  if (moduleData) {
    isModuleActive = moduleData.status === 'active';
  } else {
    isModuleActive = planIncludesModule;
  }

  // Plan Crecimiento (o precio $0) por defecto sin copiloto salvo que el admin lo active
  const planNameLower = (planData?.name || businessData?.planName || '').toLowerCase();
  if (planNameLower.includes('crecimiento') && !moduleData) {
    isModuleActive = false;
  }

  // 4. Calcular Límite Base desde "Límites Técnicos Extra" del plan
  let baseLimit = 10; // Default estándar
  if (planData) {
    if (Array.isArray(planData.extraLimits)) {
      const extraLimitItem = planData.extraLimits.find((item: any) =>
        item.key === 'jev_copiloto_limite_diario' || item.key === 'copiloto_ia' || item.key === 'jev_copiloto'
      );
      if (extraLimitItem && typeof extraLimitItem.value === 'number') {
        baseLimit = extraLimitItem.value;
      }
    } else if (planNameLower.includes('profesional')) {
      baseLimit = 20;
    } else if (planNameLower.includes('crecimiento')) {
      baseLimit = 0;
    }
  }

  // 5. Calcular Extra(+) por negocio
  const extraLimit = typeof moduleData?.extra === 'number' ? moduleData.extra : 0;

  // TOTAL REAL = BASE + EXTRA
  const totalReal = Math.max(0, baseLimit + extraLimit);

  // 6. Consultar consumo del día de hoy en jev_copilot_usage
  const usageDocId = \`\${businessId}_\${today}\`;
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

/**
 * Incremento atómico en el consumo diario de consultas IA
 */
export async function consumeJevCopilotCredit(businessId: string): Promise<void> {
  const db = await getAdminFirestore();
  const today = getTodayDateString();
  const usageDocId = \`\${businessId}_\${today}\`;

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
`;

fs.writeFileSync(servicePath, serviceContent, 'utf8');
console.log(`✅ Archivo aislado creado: ${servicePath}`);

// ==========================================
// 2. MODIFICACIÓN QUIRÚRGICA EN jevEngineWhatsapp.ts
// ==========================================
const enginePath = path.join(process.cwd(), 'src/jev/jevEngineWhatsapp.ts');
const engineBackup = enginePath + '.bak';

fs.copyFileSync(enginePath, engineBackup);
console.log(`📦 Respaldo creado: ${engineBackup}`);

let engineCode = fs.readFileSync(enginePath, 'utf8');

// Verificar si ya tiene el servicio importado
if (engineCode.includes('jevLimitsService')) {
  console.log("ℹ️ jevEngineWhatsapp.ts ya tiene la integración con jevLimitsService.");
} else {
  // 1. Agregar importación
  const importStatement = `import { getJevCopilotLimitsInfo, consumeJevCopilotCredit } from './jevLimitsService';\n`;
  engineCode = engineCode.replace(
    "import { getContextoWhatsapp, ContextoWhatsapp, ChatPendiente } from './contextAggregatorWhatsapp';",
    `${importStatement}import { getContextoWhatsapp, ContextoWhatsapp, ChatPendiente } from './contextAggregatorWhatsapp';`
  );

  // 2. Insertar validación de límites antes de procesar IA
  const targetCheck = `export async function obtenerCopilotoWhatsapp(businessId: string): Promise<CopilotoWhatsappOutput> {`;
  const validationSnippet = `export async function obtenerCopilotoWhatsapp(businessId: string): Promise<CopilotoWhatsappOutput> {
  // Validación de límites y toggle de JEV Copiloto (Reglas Fase 3)
  const limitsInfo = await getJevCopilotLimitsInfo(businessId);
  if (!limitsInfo.isModuleActive) {
    return {
      diagnostico: 'El módulo JEV Copiloto no está activo para el plan actual de este negocio.',
      totalPendientes: 0,
      sugerencias: [],
      patronesAprendidos: [],
      fechaGeneracion: new Date().toISOString(),
    };
  }

  if (!limitsInfo.canConsume) {
    return {
      diagnostico: \`Has alcanzado el límite diario de consultas (\${limitsInfo.usageToday}/\${limitsInfo.totalReal}) de JEV Copiloto para hoy. El cupo se reinicia automáticamente mañana o puedes solicitar una ampliación al administrador.\`,
      totalPendientes: 0,
      sugerencias: [],
      patronesAprendidos: [],
      fechaGeneracion: new Date().toISOString(),
    };
  }\n`;

  engineCode = engineCode.replace(targetCheck, validationSnippet);

  // 3. Insertar consumo atómico únicamente si se generan sugerencias de IA
  const generationAnchor = `// Generar sugerencias priorizadas y borradores accionables en español (Regla 8)`;
  const consumeCall = `// Consumo atómico de 1 crédito solo al realizar la llamada real (Fase 3)\n  await consumeJevCopilotCredit(businessId);\n\n  `;
  engineCode = engineCode.replace(generationAnchor, consumeCall + generationAnchor);

  fs.writeFileSync(enginePath, engineCode, 'utf8');
  console.log("✅ jevEngineWhatsapp.ts modificado quirúrgicamente con éxito.");
}

console.log("🎉 FASE 3 completada con éxito.");
