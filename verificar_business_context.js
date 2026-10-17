const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const catPage = path.join(ROOT, 'src/app/(dashboard)/dashboard/catalogo/page.tsx');
const lines = fs.readFileSync(catPage, 'utf8').split('\n');

console.log(lines.slice(95, 145).map((l, i) => `${96 + i}: ${l}`).join('\n'));
