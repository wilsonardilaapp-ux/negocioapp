const fs = require('fs');

const file = 'src/app/(dashboard)/dashboard/loyalty/page.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

console.log('--- Líneas 140 a 210 de dashboard/loyalty/page.tsx ---');
console.log(lines.slice(140, 210).map((l, i) => `${i + 141}: ${l}`).join('\n'));
