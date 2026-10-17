const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const catPage = path.join(ROOT, 'src/app/(dashboard)/dashboard/catalogo/page.tsx');
const lines = fs.readFileSync(catPage, 'utf8').split('\n');

console.log('--- BLOQUE 1: BARRA SUPERIOR DE HERRAMIENTAS (460 - 495) ---');
console.log(lines.slice(455, 495).map((l, i) => `${456 + i}: ${l}`).join('\n'));

console.log('\n--- BLOQUE 2: COLUMNAS Y ACCIONES DE FILA (660 - 720) ---');
console.log(lines.slice(660, 720).map((l, i) => `${661 + i}: ${l}`).join('\n'));
