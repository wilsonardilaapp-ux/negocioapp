const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const catPage = path.join(ROOT, 'src/app/(public)/catalog/[businessId]/page.tsx');
const lines = fs.readFileSync(catPage, 'utf8').split('\n');

const idx = lines.findIndex(l => l.includes('<PublicProductCard'));
if (idx !== -1) {
  console.log('Bloque actual de <PublicProductCard />:');
  console.log(lines.slice(idx, idx + 10).map((l, i) => `${idx + 1 + i}: ${l}`).join('\n'));
} else {
  console.log('No se encontró PublicProductCard');
}
