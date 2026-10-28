const fs = require('fs');

const file = 'src/app/(admin)/superadmin/negocios/page.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

console.log('--- Líneas 220 a 255 de superadmin/negocios/page.tsx ---');
console.log(lines.slice(220, 255).map((l, i) => `${i + 221}: ${l}`).join('\n'));
