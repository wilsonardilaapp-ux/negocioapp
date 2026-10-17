const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const catPage = path.join(ROOT, 'src/app/(public)/catalog/[businessId]/page.tsx');
const lines = fs.readFileSync(catPage, 'utf8').split('\n');

console.log(lines.slice(505, 525).map((l, i) => `${506 + i}: ${l}`).join('\n'));
