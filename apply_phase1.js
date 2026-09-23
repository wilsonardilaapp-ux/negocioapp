const fs = require('fs');
const path = require('path');

function backupAndEdit(filePath, modifier) {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`❌ Archivo no encontrado: ${filePath}`);
    return;
  }
  const original = fs.readFileSync(absPath, 'utf8');
  const bakPath = `${absPath}.bak`;
  if (!fs.existsSync(bakPath)) {
    fs.writeFileSync(bakPath, original, 'utf8');
    console.log(`🛡️ Respaldo creado: ${filePath}.bak`);
  }
  const modified = modifier(original);
  if (modified !== original) {
    fs.writeFileSync(absPath, modified, 'utf8');
    console.log(`✅ Modificado exitosamente (aditivo): ${filePath}`);
  } else {
    console.log(`ℹ️ Sin cambios requeridos (ya aplicado): ${filePath}`);
  }
}

// 1. CREAR src/constants/pricingPlans.ts (ARCHIVO NUEVO)
const pricingPlansDir = path.resolve('src/constants');
if (!fs.existsSync(pricingPlansDir)) {
  fs.mkdirSync(pricingPlansDir, { recursive: true });
}

const pricingPlansContent = `/**
 * @fileOverview Constante central única y funciones de cálculo de precios.
 * Regla de negocio:
 * - Plan FIJO: comision 0%. El cliente paga basePrice exacto.
 * - Plan HÍBRIDO: base + comision con redondeo a múltiplo de $100 hacia arriba.
 * - El restaurante SIEMPRE recibe el 100% de su precio base.
 */

export const PORCENTAJES_HIBRIDOS = {
  arranque: 0.15,
  crecimiento: 0.12,
  profesional: 0.10,
  unlimited: 0.09,
} as const;

export const PLANES_FIJOS = {
  comision: 0,
} as const;

export type PlanType = 'fijo' | 'hibrido';

export type PricingContext = {
  planType?: PlanType;
  comisionRate?: number; // Ej: 0.12 o 12
  planSlug?: string;
  planName?: string;
};

/**
 * Redondeo a múltiplo de $100 hacia arriba
 * Ej: 20000 * 1.15 = 23000 -> 23000
 * Ej: 13000 * 1.15 = 14950 -> 15000
 */
export function roundUp100(value: number): number {
  if (!value || isNaN(value) || value <= 0) return 0;
  return Math.ceil(value / 100) * 100;
}

/**
 * Obtiene el porcentaje de comisión híbrido a aplicar
 */
export function obtenerTasaComisionHibrida(context?: PricingContext | null): number {
  if (!context) return PORCENTAJES_HIBRIDOS.arranque; // Default híbrido: 15%

  // Si tiene tasa numérica directa configurada en su plan
  if (context.comisionRate !== undefined && context.comisionRate !== null) {
    const rate = Number(context.comisionRate);
    return rate > 1 ? rate / 100 : rate;
  }

  // Si se puede inferir por slug o nombre
  const identifier = (context.planSlug || context.planName || '').toLowerCase();
  if (identifier.includes('arranque')) return PORCENTAJES_HIBRIDOS.arranque;
  if (identifier.includes('crecimiento')) return PORCENTAJES_HIBRIDOS.crecimiento;
  if (identifier.includes('profesional')) return PORCENTAJES_HIBRIDOS.profesional;
  if (identifier.includes('unlimited') || identifier.includes('ilimitado')) return PORCENTAJES_HIBRIDOS.unlimited;

  return PORCENTAJES_HIBRIDOS.arranque; // 15% por defecto
}

/**
 * Función única central: calcularPrecioCliente
 * - Si planType === 'fijo' -> retorna basePrice sin recargo ni redondeo.
 * - Si planType === 'hibrido' -> basePrice * (1 + %plan) redondeado a $100 arriba.
 */
export function calcularPrecioCliente(
  basePrice: number | undefined | null,
  context?: PricingContext | null
): number {
  const safeBase = Number(basePrice) || 0;
  if (safeBase <= 0) return 0;

  // Si es plan fijo o no se define tipo híbrido, no hay recargo
  if (context?.planType === 'fijo') {
    return safeBase;
  }

  if (context?.planType === 'hibrido') {
    const tasa = obtenerTasaComisionHibrida(context);
    const precioCalculado = safeBase * (1 + tasa);
    return roundUp100(precioCalculado);
  }

  // Fallback seguro: si no se especifica, se mantiene el precio base exacto
  return safeBase;
}
`;

fs.writeFileSync(path.resolve('src/constants/pricingPlans.ts'), pricingPlansContent, 'utf8');
console.log('✅ Archivo nuevo creado: src/constants/pricingPlans.ts');

// 2. ACTUALIZAR src/models/product.ts (ADITIVO)
backupAndEdit('src/models/product.ts', (content) => {
  if (content.includes('basePrice?:')) return content;
  return content.replace(
    /price:\s*number;/,
    `price: number;\n    basePrice?: number; // ADITIVO: Precio base asignado al restaurante`
  );
});

// 3. ACTUALIZAR src/models/business.ts (ADITIVO)
backupAndEdit('src/models/business.ts', (content) => {
  if (content.includes('planType?:')) return content;
  return content.replace(
    /planName\?: string;/,
    `planName?: string;\n    planType?: 'fijo' | 'hibrido'; // ADITIVO: Tipo de modelo de suscripción`
  );
});

// 4. CREAR SCRIPT DE MIGRACIÓN: scripts/migrate_phase1.ts
const scriptsDir = path.resolve('scripts');
if (!fs.existsSync(scriptsDir)) {
  fs.mkdirSync(scriptsDir, { recursive: true });
}

const migrationScriptContent = `import { getAdminFirestore } from '../src/firebase/server-init';

async function run() {
  console.log('🚀 Iniciando migración de Fase 1 (No destructiva)...');
  const db = await getAdminFirestore();

  // 1. Obtener nombres/IDs de planes híbridos existentes
  const hybridSnap = await db.collection('hybrid_plans').get();
  const hybridNames = new Set<string>();
  hybridSnap.forEach(doc => {
    hybridNames.add(doc.id.toLowerCase());
    const data = doc.data();
    if (data.name) hybridNames.add(String(data.name).toLowerCase());
    if (data.slug) hybridNames.add(String(data.slug).toLowerCase());
  });
  console.log(\`📦 Planes híbridos detectados en Firestore: \${Array.from(hybridNames).join(', ')}\`);

  // 2. Migrar Restaurantes (businesses)
  const businessesSnap = await db.collection('businesses').get();
  let businessesUpdated = 0;
  let productsUpdated = 0;

  for (const bDoc of businessesSnap.docs) {
    const bData = bDoc.data();
    const currentPlanName = String(bData.planName || '').toLowerCase();
    
    // Determinar planType según coincidencia con hybrid_plans
    const isHybrid = hybridNames.has(currentPlanName) || 
                     currentPlanName.includes('crecimiento') || 
                     currentPlanName.includes('estandar') || 
                     currentPlanName.includes('profesional') ||
                     currentPlanName.includes('basico') ||
                     currentPlanName.includes('arranque');
    
    const assignedPlanType = isHybrid ? 'hibrido' : 'fijo';

    if (!bData.planType || bData.planType !== assignedPlanType) {
      await bDoc.ref.update({ planType: assignedPlanType });
      businessesUpdated++;
      console.log(\`  🏬 Negocio '\${bData.name || bDoc.id}' -> planType: '\${assignedPlanType}' (planName: \${bData.planName || 'N/A'})\`);
    }

    // 3. Migrar Platos de este negocio (subcolección products)
    const productsSnap = await bDoc.ref.collection('products').get();
    for (const pDoc of productsSnap.docs) {
      const pData = pDoc.data();
      // Si basePrice no está definido o no existe, copiamos price -> basePrice
      if (pData.basePrice === undefined || pData.basePrice === null) {
        const fallbackPrice = typeof pData.price === 'number' ? pData.price : 0;
        await pDoc.ref.update({ basePrice: fallbackPrice });
        productsUpdated++;
      }
    }
  }

  console.log('\\n================ RESUMEN DE MIGRACIÓN ================');
  console.log(\`✅ Negocios procesados: \${businessesSnap.size}\`);
  console.log(\`✅ Negocios con planType asignado/actualizado: \${businessesUpdated}\`);
  console.log(\`✅ Platos/Productos con basePrice inicializado: \${productsUpdated}\`);
  console.log('=======================================================\\n');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error en migración:', err);
    process.exit(1);
  });
`;

fs.writeFileSync(path.resolve('scripts/migrate_phase1.ts'), migrationScriptContent, 'utf8');
console.log('✅ Script de migración creado: scripts/migrate_phase1.ts');
console.log('\n🎉 Fase 1 aplicada en código local con respaldos .bak.');
