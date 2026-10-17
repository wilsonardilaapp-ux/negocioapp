const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

console.log('====================================================');
console.log('🚀 FASE 4: EXTENSIÓN DE MODELOS PARA CONTROL ADMINISTRATIVO');
console.log('====================================================\n');

// 1. CREAR ARCHIVO NUEVO: src/models/social-proof.ts
const socialProofModelPath = path.join(ROOT, 'src', 'models', 'social-proof.ts');
const socialProofModelContent = `/**
 * Modelo y tipos de configuración para el módulo de Prueba Social en Markix.
 */

export interface ProductSocialProofConfig {
  socialProofRecentSales?: boolean; // Default true: Mostrar 🔥 X vendidos en 12h si >= 3
  socialProofLiveViewers?: boolean; // Default true: Mostrar �� X mirando si >= 1 venta en 7d
}

export interface BusinessSocialProofConfig {
  socialProofEnabled?: boolean; // Switch global del dueño para el catálogo público
}

export interface SocialProofProductMetrics {
  productId: string;
  salesLast12Hours: number;
  salesLast7Days: number;
  liveViewers: number;
  showRecentSales: boolean;
  showLiveViewers: boolean;
}

export interface SocialProofCatalogMetrics {
  businessId: string;
  isAuthorized: boolean;
  isEnabledByOwner: boolean;
  metrics: Record<string, SocialProofProductMetrics>;
}
`;

fs.writeFileSync(socialProofModelPath, socialProofModelContent, 'utf8');
console.log('✅ Creado archivo nuevo: src/models/social-proof.ts');

// 2. ACTUALIZAR PRODUCT.TS (ADITIVO + BACKUP)
const productFile = path.join(ROOT, 'src', 'models', 'product.ts');
const productBackup = path.join(ROOT, 'src', 'models', 'product.ts.bak');
if (fs.existsSync(productFile)) {
  fs.copyFileSync(productFile, productBackup);
  console.log('📦 Respaldo creado: src/models/product.ts.bak');

  let prodContent = fs.readFileSync(productFile, 'utf8');
  if (!prodContent.includes('socialProofRecentSales')) {
    prodContent = prodContent.replace(
      'imageSize?: number;',
      `imageSize?: number;\n    // ADITIVO: Configuración Prueba Social\n    socialProofRecentSales?: boolean;\n    socialProofLiveViewers?: boolean;`
    );
    fs.writeFileSync(productFile, prodContent, 'utf8');
    console.log('✅ Campos agregados a Product en src/models/product.ts');
  } else {
    console.log('ℹ️ Campos de prueba social ya presentes en src/models/product.ts');
  }
}

// 3. ACTUALIZAR BUSINESS.TS (ADITIVO + BACKUP)
const businessFile = path.join(ROOT, 'src', 'models', 'business.ts');
const businessBackup = path.join(ROOT, 'src', 'models', 'business.ts.bak');
if (fs.existsSync(businessFile)) {
  fs.copyFileSync(businessFile, businessBackup);
  console.log('📦 Respaldo creado: src/models/business.ts.bak');

  let bizContent = fs.readFileSync(businessFile, 'utf8');
  if (!bizContent.includes('socialProofEnabled')) {
    bizContent = bizContent.replace(
      'loyaltyConfig?: LoyaltyConfig;',
      `loyaltyConfig?: LoyaltyConfig;\n    // ADITIVO: Switch global Prueba Social\n    socialProofEnabled?: boolean;`
    );
    fs.writeFileSync(businessFile, bizContent, 'utf8');
    console.log('✅ Campo socialProofEnabled agregado a Business en src/models/business.ts');
  } else {
    console.log('ℹ️ Campo socialProofEnabled ya presente en src/models/business.ts');
  }
}

console.log('\n✅ Modelos y tipos actualizados correctamente.');
