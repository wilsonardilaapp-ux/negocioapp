const fs = require('fs');

if (fs.existsSync('src/lib/utils.ts')) {
  const content = fs.readFileSync('src/lib/utils.ts', 'utf8');
  const idx = content.indexOf('function normalizeModuleId');
  if (idx !== -1) {
    console.log(content.slice(idx, idx + 400));
  }
}

if (fs.existsSync('src/app/(admin)/superadmin/modulos/page.tsx')) {
  const content = fs.readFileSync('src/app/(admin)/superadmin/modulos/page.tsx', 'utf8');
  console.log('--- Primeras 80 líneas de superadmin/modulos/page.tsx ---');
  console.log(content.slice(0, 1500));
}
