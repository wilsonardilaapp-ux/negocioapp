import { 
  calcularPrecioCliente, 
  roundUp100, 
  PORCENTAJES_HIBRIDOS, 
  PLANES_FIJOS 
} from './src/constants/pricingPlans';

console.log('🧪 INICIANDO VALIDACIÓN FINAL INTEGRAL (FASE 7)...\n');

let passed = 0;
let total = 0;

function assert(description: string, condition: boolean) {
  total++;
  if (condition) {
    console.log(`  ✅ [PASS] ${description}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${description}`);
  }
}

// 1. PRUEBAS DE REDONDEO Y CÁLCULO HÍBRIDO
console.log('--- 1. CÁLCULOS HÍBRIDOS (Menfy Service) ---');
const test1 = calcularPrecioCliente(20000, { planType: 'hibrido', comisionRate: 0.15 });
assert('$20.000 x 15% da $23.000 exactos', test1 === 23000);

const test2 = calcularPrecioCliente(13000, { planType: 'hibrido', comisionRate: 0.15 });
assert('$13.000 x 15% ($14.950) redondea a $15.000 arriba', test2 === 15000);

const test3 = calcularPrecioCliente(22000, { planType: 'hibrido', comisionRate: 0.10 });
assert('$22.000 en Plan Profesional (10%) da $24.200', test3 === 24200);

const test4 = calcularPrecioCliente(22000, { planType: 'hibrido', comisionRate: 0.09 });
assert('$22.000 en Plan Unlimited (9%) da $23.980 -> $24.000', test4 === 24000);

// 2. PRUEBAS DE PLANES FIJOS (0% COMISIÓN)
console.log('\n--- 2. CÁLCULOS PLANES FIJOS (0% Comisión) ---');
const testFixed1 = calcularPrecioCliente(20000, { planType: 'fijo' });
assert('$20.000 en Plan Fijo retorna $20.000 exactos (sin recargo ni redondeo)', testFixed1 === 20000);

const testFixed2 = calcularPrecioCliente(13000, { planType: 'fijo' });
assert('$13.000 en Plan Fijo retorna $13.000 exactos (sin alteración)', testFixed2 === 13000);

const testFixedDefault = calcularPrecioCliente(15555, null);
assert('Sin plan especificado (fallback) retorna precio base exacto', testFixedDefault === 15555);

// 3. PRUEBAS DE SEGURIDAD (NUNCA MENOR QUE BASE)
console.log('\n--- 3. SEGURIDAD Y CASOS BORDE ---');
assert('Precio 0 retorna 0', calcularPrecioCliente(0, { planType: 'hibrido' }) === 0);
assert('Precio negativo o nulo retorna 0', calcularPrecioCliente(-500, { planType: 'hibrido' }) === 0);
assert('Cliente en híbrido nunca paga menos que la base', calcularPrecioCliente(10000, { planType: 'hibrido' }) >= 10000);

console.log(`\n================ RESULTADO FINAL ================`);
console.log(`Pruebas ejecutadas: ${total} | Pasaron: ${passed} | Fallaron: ${total - passed}`);
if (passed === total) {
  console.log('🎉 TODAS LAS REGLAS DE NEGOCIO VALIDADAS AL 100%.');
} else {
  console.error('⚠️ ALGUNAS PRUEBAS FALLARON.');
  process.exit(1);
}
