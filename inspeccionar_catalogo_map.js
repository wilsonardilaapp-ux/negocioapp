const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const catPage = path.join(ROOT, 'src/app/(dashboard)/dashboard/catalogo/page.tsx');
const lines = fs.readFileSync(catPage, 'utf8').split('\n');

console.log('--- LÍNEAS 580 A 620 DE CATALOGO/PAGE.TSX ---');
console.log(lines.slice(580, 620).map((l, i) => `${581 + i}: ${l}`).join('\n'));
