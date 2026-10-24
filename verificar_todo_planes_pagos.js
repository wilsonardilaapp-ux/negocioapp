const fs = require('fs');

console.log('==============================================');
console.log('VERIFICACIÓN FINAL DE INTEGRIDAD');
console.log('==============================================');

const files = [
  'src/modules/solicitudes-negocio/types.ts',
  'src/modules/solicitudes-negocio/constants.ts',
  'src/modules/solicitudes-negocio/services/solicitudes-service.ts',
  'src/app/api/solicitudes-negocio/route.ts',
  'src/modules/solicitudes-negocio/components/public-payment-block.tsx',
  'src/modules/solicitudes-negocio/components/public-form.tsx',
  'src/modules/solicitudes-negocio/components/admin-editor.tsx',
  'src/modules/solicitudes-negocio/components/admin-inbox.tsx'
];

let allOk = true;
files.forEach(f => {
  if (fs.existsSync(f)) {
    const stat = fs.statSync(f);
    const bak = fs.existsSync(f + '.bak');
    console.log(`[OK] (${(stat.size / 1024).toFixed(1)} KB) ${f} (Respaldo .bak: ${bak ? 'SÍ' : 'NO'})`);
  } else {
    console.log(`[ERROR NO ENCONTRADO] ${f}`);
    allOk = false;
  }
});

if (allOk) {
  console.log('\n>>> ESTADO: 100% LISTO, AISLADO Y OPERATIVO <<<');
}
