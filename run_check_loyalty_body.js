const fs = require('fs');

const file = 'src/app/(dashboard)/dashboard/loyalty/page.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

console.log('--- Líneas 50 a 115 de dashboard/loyalty/page.tsx ---');
console.log(lines.slice(50, 115).map((l, i) => `${i + 51}: ${l}`).join('\n'));
