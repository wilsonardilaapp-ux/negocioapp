const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const catPage = path.join(ROOT, 'src/app/(dashboard)/dashboard/catalogo/page.tsx');
const lines = fs.readFileSync(catPage, 'utf8').split('\n');

console.log('--- LÍNEAS 495 A 575 DE CATALOGO/PAGE.TSX ---');
console.log(lines.slice(495, 575).map((l, i) => `${496 + i}: ${l}`).join('\n'));
