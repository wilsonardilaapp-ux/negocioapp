const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const catPublicPage = path.join(ROOT, 'src/app/(public)/catalog/[businessId]/page.tsx');
const lines = fs.readFileSync(catPublicPage, 'utf8').split('\n');

lines.forEach((l, i) => {
  if (l.includes('<PublicProductCard')) {
    console.log(`Línea ${i + 1}:`);
    console.log(lines.slice(i, i + 8).map(x => `  ${x}`).join('\n'));
  }
});
