const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const cardFile = path.join(ROOT, 'src/components/catalogo/public-product-card.tsx');
const lines = fs.readFileSync(cardFile, 'utf8').split('\n');

console.log('--- ESTRUCTURA DE CONTENIDO EN PUBLIC-PRODUCT-CARD.TSX ---');
lines.forEach((l, i) => {
  if (l.includes('discountInfo') || l.includes('formatCurrency') || l.includes('CardFooter') || l.includes('ratingCount') || l.includes('onBuy')) {
    console.log(`Línea ${i + 1}: ${l.trim()}`);
  }
});
