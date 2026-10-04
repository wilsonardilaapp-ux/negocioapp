const fs = require('fs');

// 1. Corregir contextAggregatorLoyalty.ts
const aggPath = 'src/jev/contextAggregatorLoyalty.ts';
let agg = fs.readFileSync(aggPath, 'utf8');

// Corrección de obtenerAccionesJev
agg = agg.replace('await obtenerAccionesJev(businessId, 20);', 'await obtenerAccionesJev(businessId);');

// Corrección de recoveryStats.count
agg = agg.replace(
  'recoveredCount: recoveryStats.recoveredCount || 0,',
  'recoveredCount: (recoveryStats as any)?.count || (recoveryStats as any)?.recoveredCount || 0,'
);
fs.writeFileSync(aggPath, agg, 'utf8');
console.log('✅ Corregido src/jev/contextAggregatorLoyalty.ts');

// 2. Corregir jevEngineLoyalty.ts
const enginePath = 'src/jev/jevEngineLoyalty.ts';
let eng = fs.readFileSync(enginePath, 'utf8');
eng = eng.replace("tipo: 'loyalty',", "tipo: 'retencion',");
fs.writeFileSync(enginePath, eng, 'utf8');
console.log('✅ Corregido src/jev/jevEngineLoyalty.ts');

