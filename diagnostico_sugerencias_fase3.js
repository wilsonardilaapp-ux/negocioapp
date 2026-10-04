const fs = require('fs');

console.log('=== [PASO 1.3] INSPECCIÓN DEL FLUJO DE SUGERENCIAS Y REGLAS ===\n');

// 1. Ver getSuggestion en src/ai/flows/suggestion-flow.ts
const flowFile = 'src/ai/flows/suggestion-flow.ts';
if (fs.existsSync(flowFile)) {
  console.log(`1. Código de ${flowFile}:`);
  const content = fs.readFileSync(flowFile, 'utf8');
  console.log(content.slice(0, 2500));
}

// 2. Ver cómo se renderiza <SuggestionModal en catalog/[businessId]/page.tsx
const catalogPage = 'src/app/(public)/catalog/[businessId]/page.tsx';
if (fs.existsSync(catalogPage)) {
  console.log(`\n2. Renderizado de <SuggestionModal en ${catalogPage}:`);
  const lines = fs.readFileSync(catalogPage, 'utf8').split('\n');
  lines.forEach((l, idx) => {
    if (/<SuggestionModal|activeSuggestion/i.test(l)) {
      console.log(`L${idx+1}: ${l}`);
      lines.slice(idx, idx + 10).forEach(sub => console.log('   ', sub));
    }
  });

  // Ver handleBuyNow completo
  console.log('\n--- Función handleBuyNow en page.tsx: ---');
  const buyIdx = lines.findIndex(l => l.includes('const handleBuyNow ='));
  if (buyIdx !== -1) {
    lines.slice(buyIdx, buyIdx + 30).forEach(l => console.log(l));
  }

  // Ver cómo se obtiene resolvedBusinessId
  console.log('\n--- Resolución de businessId en page.tsx: ---');
  lines.filter(l => l.includes('resolvedBusinessId')).slice(0, 10).forEach(l => console.log('  ', l.trim()));
}

// 3. Ver qué pasa al hacer clic en "Ver" (ProductViewModal)
const viewModalFile = 'src/components/catalogo/product-view-modal.tsx';
if (fs.existsSync(viewModalFile)) {
  console.log(`\n3. Handlers de compra en ${viewModalFile}:`);
  const lines = fs.readFileSync(viewModalFile, 'utf8').split('\n');
  lines.forEach((l, idx) => {
    if (/onAddToCart|onBuy|handleBuy|Comprar|Agregar/i.test(l)) {
      console.log(`L${idx+1}: ${l.trim()}`);
    }
  });
}

console.log('\n=== FIN DIAGNÓSTICO FASE 3 ===');
