const fs = require('fs');

// 1. Corregir llamada en src/jev/contextAggregatorLoyalty.ts
const aggPath = 'src/jev/contextAggregatorLoyalty.ts';
let agg = fs.readFileSync(aggPath, 'utf8');
agg = agg.replace(
  'historialMemoria = await obtenerAccionesJev(businessId);',
  `historialMemoria = await obtenerAccionesJev({
      usuario: businessId,
      tipo: 'retencion',
      limite: 15,
    });`
);
fs.writeFileSync(aggPath, agg, 'utf8');
console.log('✅ Corregido contextAggregatorLoyalty.ts');

// 2. Corregir registrarAccionFidelizacion en src/jev/jevEngineLoyalty.ts
const enginePath = 'src/jev/jevEngineLoyalty.ts';
let eng = fs.readFileSync(enginePath, 'utf8');

const oldBlock = `export async function registrarAccionFidelizacion({
  businessId,
  accion,
  detalle,
}: {
  businessId: string;
  accion: string;
  detalle: string;
}) {
  return registrarAccionJev({
    businessId,
    modulo: 'fidelizacion',
    tipo: 'retencion',
    accion,
    detalle,
    estado: 'completado',
  });
}`;

const newBlock = `export async function registrarAccionFidelizacion({
  businessId,
  accion,
  detalle,
}: {
  businessId: string;
  accion: string;
  detalle: string;
}) {
  return registrarAccionJev({
    usuario: businessId,
    tipo: 'retencion',
    accion,
    origen: 'dashboard',
    datos: { detalle },
  });
}`;

eng = eng.replace(oldBlock, newBlock);
fs.writeFileSync(enginePath, eng, 'utf8');
console.log('✅ Corregido jevEngineLoyalty.ts');

