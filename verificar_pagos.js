const fs = require('fs');

console.log('==============================================');
console.log('VERIFICANDO ARCHIVOS DE MÉTODOS DE PAGO');
console.log('==============================================');

const files = [
  'src/modules/solicitudes-negocio/types-payments.ts',
  'src/modules/solicitudes-negocio/services/solicitud-payments-service.ts',
  'src/app/api/solicitudes-negocio/payment-methods/route.ts',
  'src/app/api/solicitudes-negocio/admin/payment-methods/route.ts',
  'src/modules/solicitudes-negocio/components/admin-payments-tab.tsx',
  'src/modules/solicitudes-negocio/components/public-payment-block.tsx',
  'src/modules/solicitudes-negocio/components/admin-editor.tsx',
  'src/modules/solicitudes-negocio/components/public-form.tsx'
];

let allOk = true;
files.forEach(f => {
  if (fs.existsSync(f)) {
    const stat = fs.statSync(f);
    console.log(`[OK] (${(stat.size / 1024).toFixed(1)} KB) ${f}`);
  } else {
    console.log(`[ERROR NO ENCONTRADO] ${f}`);
    allOk = false;
  }
});

// Comprobar respaldos
const baks = [
  'src/modules/solicitudes-negocio/components/admin-editor.tsx.bak',
  'src/modules/solicitudes-negocio/components/public-form.tsx.bak'
];

baks.forEach(b => {
  console.log(`[BACKUP]: ${b} -> ${fs.existsSync(b) ? 'PRESENTE' : 'FALTA'}`);
});

console.log('==============================================');
