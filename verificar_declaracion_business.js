const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const catPage = path.join(ROOT, 'src/app/(dashboard)/dashboard/catalogo/page.tsx');
const lines = fs.readFileSync(catPage, 'utf8').split('\n');

lines.slice(0, 120).forEach((l, i) => {
  if (l.includes('businessId') || l.includes('useUser')) {
    console.log(`Línea ${i + 1}: ${l.trim()}`);
  }
});
