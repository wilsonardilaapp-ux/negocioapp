const fs = require('fs');

if (fs.existsSync('src/app/(admin)/superadmin/modulos/page.tsx')) {
  const content = fs.readFileSync('src/app/(admin)/superadmin/modulos/page.tsx', 'utf8');
  console.log('--- Identificadores en superadmin/modulos/page.tsx ---');
  const matches = content.match(/id:\s*['"][^'"]+['"]/g) || [];
  console.log([...new Set(matches)].join(', '));
}

// También revisamos cómo normalizeModuleId normaliza o si hay constantes
if (fs.existsSync('src/lib/utils.ts')) {
  const utils = fs.readFileSync('src/lib/utils.ts', 'utf8');
  const lines = utils.split('\n').filter(l => /normalizeModuleId/i.test(l) || /kardex|directorio|reserva/i.test(l));
  console.log('--- normalizeModuleId en utils.ts ---');
  console.log(lines.slice(0, 10).join('\n'));
}
