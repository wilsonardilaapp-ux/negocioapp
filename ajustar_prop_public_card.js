const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const targetFile = path.join(ROOT, 'src/app/(public)/catalog/[businessId]/page.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

if (!content.includes('socialProof={socialProofData?.metrics?.[product.id]}')) {
  const targetSnippet = 'planContext={pricingContext}';
  content = content.replace(
    targetSnippet,
    `planContext={pricingContext}\n                                    socialProof={socialProofData?.metrics?.[product.id]}`
  );
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('✅ Prop socialProof inyectada con éxito.');
} else {
  console.log('ℹ️ Prop ya inyectada.');
}

// Verificación
const lines = fs.readFileSync(targetFile, 'utf8').split('\n');
const idx = lines.findIndex(l => l.includes('<PublicProductCard'));
console.log('\nBloque verificado:');
console.log(lines.slice(idx, idx + 10).map((l, i) => `${idx + 1 + i}: ${l}`).join('\n'));
