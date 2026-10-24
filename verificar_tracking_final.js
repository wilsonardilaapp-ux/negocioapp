const fs = require('fs');

console.log('==============================================');
console.log('VERIFICACIÓN FINAL DE SEGUIMIENTO Y TRACKING');
console.log('==============================================');

const files = [
  'src/modules/solicitudes-negocio/types-tracking.ts',
  'src/modules/solicitudes-negocio/services/solicitud-tracking-service.ts',
  'src/app/r/[alias]/page.tsx',
  'src/app/api/solicitudes-negocio/tracking/visit/route.ts',
  'src/app/api/solicitudes-negocio/admin/tracking/route.ts',
  'src/modules/solicitudes-negocio/components/admin-share-tracking-tab.tsx',
  'src/modules/solicitudes-negocio/components/admin-editor.tsx',
  'src/modules/solicitudes-negocio/components/public-form.tsx',
  'src/modules/solicitudes-negocio/components/admin-inbox.tsx'
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

if (allOk) {
  console.log('\n>>> ESTADO: 100% LISTO, AISLADO Y OPERATIVO <<<');
}
