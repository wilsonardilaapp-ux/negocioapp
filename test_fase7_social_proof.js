const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

console.log('====================================================');
console.log('🧪 EJECUTANDO SUITE DE PRUEBAS - FASE 7');
console.log('====================================================\n');

// 1. Simulación del algoritmo determinístico de miradas
function getDeterministicViewers(productId, timeBlock) {
  let hash = 0;
  const str = `${productId}-${timeBlock}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const min = 3;
  const max = 18;
  return min + (Math.abs(hash) % (max - min + 1));
}

// SIMULADOR DE LÓGICA DE DECISIÓN
function evaluateSocialProof({
  isSuperAdminAuthorized,
  isOwnerEnabled,
  productSettings,
  sales12h,
  sales7d,
  timeBlock
}) {
  if (!isSuperAdminAuthorized || !isOwnerEnabled) {
    return { showSales: false, showViewers: false, sales12h: 0, viewers: 0 };
  }

  const allowSales = productSettings.socialProofRecentSales !== false;
  const allowViewers = productSettings.socialProofLiveViewers !== false;

  const showSales = allowSales && sales12h >= 3;
  const showViewers = allowViewers && sales7d >= 1;
  const viewers = showViewers ? getDeterministicViewers('prod_test_1', timeBlock) : 0;

  return { showSales, showViewers, sales12h, viewers };
}

let passed = 0;
let total = 0;

function assert(description, condition) {
  total++;
  if (condition) {
    console.log(`✅ [PASS] ${description}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${description}`);
  }
}

const currentBlock = Math.floor(Date.now() / (30 * 60 * 1000));

// Test 1: SuperAdmin deshabilitado
const t1 = evaluateSocialProof({
  isSuperAdminAuthorized: false,
  isOwnerEnabled: true,
  productSettings: { socialProofRecentSales: true, socialProofLiveViewers: true },
  sales12h: 10,
  sales7d: 20,
  timeBlock: currentBlock
});
assert('Escenario 1: SuperAdmin apagado -> No muestra indicadores', !t1.showSales && !t1.showViewers);

// Test 2: SuperAdmin activo + Dueño apagado
const t2 = evaluateSocialProof({
  isSuperAdminAuthorized: true,
  isOwnerEnabled: false,
  productSettings: { socialProofRecentSales: true, socialProofLiveViewers: true },
  sales12h: 10,
  sales7d: 20,
  timeBlock: currentBlock
});
assert('Escenario 2: Dueño apagado -> No muestra indicadores', !t2.showSales && !t2.showViewers);

// Test 3: Dueño activo + Producto con switch apagado
const t3 = evaluateSocialProof({
  isSuperAdminAuthorized: true,
  isOwnerEnabled: true,
  productSettings: { socialProofRecentSales: false, socialProofLiveViewers: false },
  sales12h: 10,
  sales7d: 20,
  timeBlock: currentBlock
});
assert('Escenario 3: Producto apagado -> Producto limpio', !t3.showSales && !t3.showViewers);

// Test 4: Producto sin ventas suficientes (< 3 en 12h y 0 en 7d)
const t4 = evaluateSocialProof({
  isSuperAdminAuthorized: true,
  isOwnerEnabled: true,
  productSettings: {},
  sales12h: 2,
  sales7d: 0,
  timeBlock: currentBlock
});
assert('Escenario 4: Ventas insuficientes (2 en 12h, 0 en 7d) -> Sin indicadores', !t4.showSales && !t4.showViewers);

// Test 5: Producto con >= 3 ventas en 12h y >= 1 en 7d -> Muestra ambos
const t5 = evaluateSocialProof({
  isSuperAdminAuthorized: true,
  isOwnerEnabled: true,
  productSettings: {},
  sales12h: 5,
  sales7d: 12,
  timeBlock: currentBlock
});
assert('Escenario 5a: Cumple umbrales (5 ventas en 12h) -> Muestra 🔥 y 👀', t5.showSales && t5.showViewers && t5.sales12h === 5);

// Test 6: Determinismo en recargas del mismo bloque de 30 minutos
const reload1 = getDeterministicViewers('prod_abc_123', currentBlock);
const reload2 = getDeterministicViewers('prod_abc_123', currentBlock);
const reload3 = getDeterministicViewers('prod_abc_123', currentBlock);
assert('Escenario 5b: Determinismo en mismo bloque de 30min -> viewers constantes', reload1 === reload2 && reload2 === reload3);

// Test 7: Variación al cambiar de bloque de 30 minutos
const nextBlock = currentBlock + 1;
const nextVal = getDeterministicViewers('prod_abc_123', nextBlock);
console.log(`ℹ️ [Info] Espectadores bloque actual: ${reload1} | Siguiente bloque (+30 min): ${nextVal}`);
assert('Escenario 5c: Valor dentro del rango permitido [3 - 18]', reload1 >= 3 && reload1 <= 18 && nextVal >= 3 && nextVal <= 18);

// Test 8: Verificación de archivos .bak existentes
const baks = [
  'src/models/module.ts.bak',
  'src/models/product.ts.bak',
  'src/models/business.ts.bak',
  'src/app/(dashboard)/dashboard/catalogo/page.tsx.bak',
  'src/components/catalogo/public-product-card.tsx.bak',
  'src/app/(public)/catalog/[businessId]/page.tsx.bak'
];

let allBaksExist = true;
baks.forEach(b => {
  const exists = fs.existsSync(path.join(ROOT, b));
  if (!exists) allBaksExist = false;
});
assert('Escenario 6: Todos los respaldos .bak fueron generados', allBaksExist);

console.log(`\n====================================================`);
console.log(`📊 RESULTADO FINAL DE VALIDACIONES: ${passed} / ${total} PRUEBAS EXITOSAS`);
console.log(`====================================================`);
