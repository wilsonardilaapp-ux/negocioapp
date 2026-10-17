const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const catPage = path.join(ROOT, 'src/app/(public)/catalog/[businessId]/page.tsx');
const lines = fs.readFileSync(catPage, 'utf8').split('\n');

lines.forEach((l, i) => {
  if (l.includes('resolvedBusinessId:') || l.includes('setPageData(')) {
    console.log(`Línea ${i + 1}: ${l.trim()}`);
  }
});
