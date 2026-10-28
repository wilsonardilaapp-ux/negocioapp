const fs = require('fs');

const file = 'src/app/(admin)/superadmin/negocios/page.tsx';
if (!fs.existsSync(file)) {
  console.log(`No existe ${file}`);
  process.exit(0);
}

const lines = fs.readFileSync(file, 'utf8').split('\n');
console.log('--- Líneas 395 a 440 de superadmin/negocios/page.tsx ---');
console.log(lines.slice(394, 440).map((l, i) => `${i + 395}: ${l}`).join('\n'));
