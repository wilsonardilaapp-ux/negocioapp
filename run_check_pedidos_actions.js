const fs = require('fs');

const file = 'src/app/(dashboard)/dashboard/pedidos/page.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

console.log('--- Contexto del LimitBanner y Botones en pedidos/page.tsx (L405 a L440) ---');
console.log(lines.slice(405, 440).join('\n'));
