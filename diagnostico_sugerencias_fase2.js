const fs = require('fs');
const { execSync } = require('child_process');

console.log('=== [PASO 1.2] INSPECCIÓN DETALLADA DEL MOTOR DE SUGERENCIAS ===\n');

// 1. Ver diferencias entre page.tsx y su .bak
console.log('1. Diff entre catalog/[businessId]/page.tsx.bak y page.tsx:');
try {
  const diff = execSync('diff -u src/app/\\(public\\)/catalog/\\[businessId\\]/page.tsx.bak src/app/\\(public\\)/catalog/\\[businessId\\]/page.tsx || true').toString();
  console.log(diff.slice(0, 1500) || '(Sin diferencias)');
} catch(e) {
  console.log('Error diff page.tsx:', e.message);
}

// 2. Ver diferencias entre public-product-card.tsx y su .bak
console.log('\n2. Diff entre public-product-card.tsx.bak y public-product-card.tsx:');
try {
  const diff = execSync('diff -u src/components/catalogo/public-product-card.tsx.bak src/components/catalogo/public-product-card.tsx || true').toString();
  console.log(diff.slice(0, 1500) || '(Sin diferencias)');
} catch(e) {
  console.log('Error diff card:', e.message);
}

// 3. Ver cómo se gestionan las sugerencias en catalog/[businessId]/page.tsx
const catalogPage = 'src/app/(public)/catalog/[businessId]/page.tsx';
if (fs.existsSync(catalogPage)) {
  console.log(`\n3. Búsqueda de reglas y modal en ${catalogPage}:`);
  const lines = fs.readFileSync(catalogPage, 'utf8').split('\n');
  lines.forEach((l, idx) => {
    if (/suggestion|sugerencia|SuggestionModal|handleAddToCart|handleBuy|onBuy/i.test(l)) {
      console.log(`L${idx+1}: ${l.trim()}`);
    }
  });
}

// 4. Ver props de SuggestionModal
const modalFile = 'src/components/suggestions/suggestion-modal.tsx';
if (fs.existsSync(modalFile)) {
  console.log(`\n4. Props y estructura de ${modalFile} (primeras 40 líneas):`);
  const lines = fs.readFileSync(modalFile, 'utf8').split('\n');
  console.log(lines.slice(0, 40).join('\n'));
}

// 5. Ver cómo emite eventos public-product-card.tsx
const cardFile = 'src/components/catalogo/public-product-card.tsx';
if (fs.existsSync(cardFile)) {
  console.log(`\n5. Handlers de botón en ${cardFile}:`);
  const lines = fs.readFileSync(cardFile, 'utf8').split('\n');
  lines.forEach((l, idx) => {
    if (/onAddToCart|onBuy|onView|onClick|Comprar|Ver/i.test(l)) {
      console.log(`L${idx+1}: ${l.trim()}`);
    }
  });
}

console.log('\n=== FIN DIAGNÓSTICO FASE 2 ===');
