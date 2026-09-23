import { 
  calcularPrecioCliente, 
  calcularTarifaServicio,
  roundUp100, 
  PORCENTAJES_HIBRIDOS, 
  COMISION_MESA_DEFAULT 
} from './src/constants/pricingPlans';

console.log('🧪 VALIDACIÓN COMPLETA DE REGLAS DE NEGOCIO v5...\n');

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

// 1. CANAL MESA (3% UNIVERSAL EN TODOS LOS HÍBRIDOS)
console.log('--- 1. CANAL MESA (3% Universal en Híbridos) ---');
const baseTest = 20000;
const mesaArranque = calcularPrecioCliente(baseTest, { planType: 'hibrido', planSlug: 'arranque-digital' }, 'mesa');
assert('Arranque en Mesa cobra +3% ($20.600)', mesaArranque === 20600);

const mesaCrecimiento = calcularPrecioCliente(baseTest, { planType: 'hibrido', planSlug: 'crecimiento' }, 'mesa');
assert('Crecimiento en Mesa cobra +3% ($20.600)', mesaCrecimiento === 20600);

const mesaProfesional = calcularPrecioCliente(baseTest, { planType: 'hibrido', planSlug: 'profesional' }, 'mesa');
assert('Profesional en Mesa cobra +3% ($20.600)', mesaProfesional === 20600);

const mesaUnlimited = calcularPrecioCliente(baseTest, { planType: 'hibrido', planSlug: 'unlimited' }, 'mesa');
assert('Unlimited en Mesa cobra +3% ($20.600)', mesaUnlimited === 20600);

const feeMesa = calcularTarifaServicio(baseTest, { planType: 'hibrido' }, 'mesa');
assert('Tarifa de servicio calculada en Mesa es exactamente $600', feeMesa === 600);

// 2. CANAL DOMICILIO (SEGÚN PLAN)
console.log('\n--- 2. CANAL DOMICILIO (Porcentaje del Plan) ---');
const domArranque = calcularPrecioCliente(baseTest, { planType: 'hibrido', planSlug: 'arranque-digital' }, 'domicilio');
assert('Arranque en Domicilio cobra +15% ($23.000)', domArranque === 23000);

const domCrecimiento = calcularPrecioCliente(baseTest, { planType: 'hibrido', planSlug: 'crecimiento' }, 'domicilio');
assert('Crecimiento en Domicilio cobra +12% ($22.400)', domCrecimiento === 22400);

const domProfesional = calcularPrecioCliente(baseTest, { planType: 'hibrido', planSlug: 'profesional' }, 'domicilio');
assert('Profesional en Domicilio cobra +10% ($22.000)', domProfesional === 22000);

const domUnlimited = calcularPrecioCliente(baseTest, { planType: 'hibrido', planSlug: 'unlimited' }, 'domicilio');
assert('Unlimited en Domicilio cobra +9% ($21.800)', domUnlimited === 21800);

const feeDomArranque = calcularTarifaServicio(baseTest, { planType: 'hibrido', planSlug: 'arranque-digital' }, 'domicilio');
assert('Tarifa de servicio calculada en Domicilio Arranque es $3.000', feeDomArranque === 3000);

// 3. PLANES FIJOS (0% EN AMBOS CANALES)
console.log('\n--- 3. PLANES FIJOS (0% en Cualquier Canal) ---');
assert('Fijo en Mesa cobra $20.000 exactos', calcularPrecioCliente(baseTest, { planType: 'fijo' }, 'mesa') === 20000);
assert('Fijo en Domicilio cobra $20.000 exactos', calcularPrecioCliente(baseTest, { planType: 'fijo' }, 'domicilio') === 20000);
assert('Fijo genera Tarifa de Servicio de $0 (fila se omite en checkout)', calcularTarifaServicio(baseTest, { planType: 'fijo' }) === 0);

console.log(`\n================ RESULTADO FINAL ================`);
console.log(`Pruebas ejecutadas: ${total} | Pasaron: ${passed} | Fallaron: ${total - passed}`);
if (passed === total) {
  console.log('🎉 TODAS LAS REGLAS DE LA v5 ESTÁN VERIFICADAS AL 100%.');
} else {
  console.error('⚠️ ALGUNAS PRUEBAS FALLARON.');
  process.exit(1);
}
