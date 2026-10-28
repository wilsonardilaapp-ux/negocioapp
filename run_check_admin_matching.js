const fs = require('fs');

const file = 'src/app/(admin)/superadmin/negocios/page.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

console.log('--- Líneas 385 a 455 de superadmin/negocios/page.tsx ---');
console.log(lines.slice(385, 455).join('\n'));
