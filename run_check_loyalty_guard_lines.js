const fs = require('fs');

const file = 'src/app/(dashboard)/dashboard/loyalty/page.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

console.log('--- Líneas 240 a 265 de dashboard/loyalty/page.tsx ---');
console.log(lines.slice(240, 265).map((l, i) => `${i + 241}: ${l}`).join('\n'));
