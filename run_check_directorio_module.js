const fs = require('fs');

if (fs.existsSync('src/models/module.ts')) {
  console.log('--- src/models/module.ts ---');
  const txt = fs.readFileSync('src/models/module.ts', 'utf8');
  txt.split('\n').forEach(l => {
    if (/directorio|rating|resena|valorac/i.test(l)) {
      console.log('  ', l.trim());
    }
  });
}

if (fs.existsSync('src/app/(admin)/superadmin/modulos/page.tsx')) {
  console.log('\n--- superadmin/modulos/page.tsx ---');
  const txt = fs.readFileSync('src/app/(admin)/superadmin/modulos/page.tsx', 'utf8');
  txt.split('\n').forEach(l => {
    if (/directorio|rating|resena|valorac/i.test(l)) {
      console.log('  ', l.trim());
    }
  });
}
