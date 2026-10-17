const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const catPage = path.join(ROOT, 'src/app/(dashboard)/dashboard/catalogo/page.tsx');
const content = fs.readFileSync(catPage, 'utf8');

const matches = content.match(/(businessId|user\.uid|business\.id|currentBusinessId)[\w\.]*/g) || [];
console.log('Variables de negocio detectadas en catalogo/page.tsx:');
console.log([...new Set(matches)]);
