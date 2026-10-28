const fs = require('fs');

const file = 'src/app/(dashboard)/dashboard/valoraciones-directorio/page.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

console.log('--- Líneas 150 a 180 ---');
console.log(lines.slice(150, 180).join('\n'));
