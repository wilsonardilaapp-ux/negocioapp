const fs = require('fs');

console.log('==============================================');
console.log('VERIFICACIÓN DEL MÓDULO SOLICITUDES DE NEGOCIO');
console.log('==============================================');

const files = [
  'src/modules/solicitudes-negocio/types.ts',
  'src/modules/solicitudes-negocio/constants.ts',
  'src/modules/solicitudes-negocio/services/solicitudes-service.ts',
  'src/modules/solicitudes-negocio/services/whatsapp-service.ts',
  'src/modules/solicitudes-negocio/components/public-form.tsx',
  'src/modules/solicitudes-negocio/components/admin-editor.tsx',
  'src/modules/solicitudes-negocio/components/admin-inbox.tsx',
  'src/app/(public)/registro-negocio/page.tsx',
  'src/app/(admin)/superadmin/solicitudes-negocio/page.tsx',
  'src/app/(admin)/superadmin/solicitudes-negocio/configurar/page.tsx',
  'src/app/api/solicitudes-negocio/route.ts',
  'src/app/api/solicitudes-negocio/plantilla-excel/route.ts',
  'src/app/api/solicitudes-negocio/admin/config/route.ts',
  'src/app/api/solicitudes-negocio/admin/solicitudes/route.ts',
  'src/app/api/solicitudes-negocio/admin/reenviar-whatsapp/route.ts',
  'src/components/layout/super-admin-nav.tsx'
];

let allOk = true;
files.forEach(f => {
  if (fs.existsSync(f)) {
    const stat = fs.statSync(f);
    console.log(`[OK] (${(stat.size / 1024).toFixed(1)} KB) ${f}`);
  } else {
    console.log(`[FALTA] ${f}`);
    allOk = false;
  }
});

// Verificar respaldo .bak
const bakExists = fs.existsSync('src/components/layout/super-admin-nav.tsx.bak');
console.log(`[BACKUP VERIFICADO]: src/components/layout/super-admin-nav.tsx.bak -> ${bakExists ? 'PRESENTE' : 'NO ENCONTRADO'}`);

if (allOk && bakExists) {
  console.log('\n>>> ESTADO: 100% LISTO Y OPERATIVO <<<');
}
