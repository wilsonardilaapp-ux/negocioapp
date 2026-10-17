const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const catPage = path.join(ROOT, 'src/app/(public)/catalog/[businessId]/page.tsx');
const lines = fs.readFileSync(catPage, 'utf8').split('\n');

console.log(lines.slice(190, 220).map((l, i) => `${191 + i}: ${l}`).join('\n'));
