const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const cardFile = path.join(ROOT, 'src/components/catalogo/public-product-card.tsx');
const lines = fs.readFileSync(cardFile, 'utf8').split('\n');

console.log(lines.slice(70, 110).map((l, i) => `${71 + i}: ${l}`).join('\n'));
