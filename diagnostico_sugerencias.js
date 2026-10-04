const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== [PASO 1] DIAGNÓSTICO: MOTOR DE SUGERENCIAS EN CATÁLOGO PÚBLICO ===\n');

function searchFiles(dir, filterRegex) {
  let results = [];
  try {
    for (const f of fs.readdirSync(dir)) {
      if (['node_modules', '.next', '.git'].includes(f)) continue;
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) results = results.concat(searchFiles(full, filterRegex));
      else if (filterRegex.test(full)) results.push(full);
    }
  } catch(e) {}
  return results;
}

// 1. Localizar archivos de catálogo público y sugerencias
console.log('1. Archivos relacionados con catálogo y sugerencias:');
const catalogFiles = searchFiles('src', /(catalog|catalogo|suggestion|sugerencia|cross-sell|crossSell)/i);
catalogFiles.forEach(f => console.log('  -', f));

// 2. Buscar referencias a modal de sugerencias o hooks de sugerencias
console.log('\n2. Menciones de SuggestionModal o reglas de sugerencias en src/:');
const modalFiles = [];
for (const f of catalogFiles) {
  try {
    const c = fs.readFileSync(f, 'utf8');
    if (/suggestion|sugerencia|crossSell|CrossSellModal|SuggestionModal/i.test(c)) {
      modalFiles.push(f);
    }
  } catch(e){}
}
modalFiles.slice(0, 15).forEach(f => console.log('  -', f));

// 3. Revisar el componente principal del catálogo público (slug)
const mainCatalog = catalogFiles.find(f => /catalog.*\[slug\].*page\.(tsx|jsx)/i.test(f)) 
  || catalogFiles.find(f => /catalog.*page\.(tsx|jsx)/i.test(f));

if (mainCatalog) {
  console.log(`\n3. Analizando Catálogo Principal: ${mainCatalog}`);
  const lines = fs.readFileSync(mainCatalog, 'utf8').split('\n');
  console.log('--- Imports de sugerencias / modal en catálogo: ---');
  lines.filter(l => /suggestion|sugerencia|modal|cart|comprar/i.test(l)).slice(0, 20).forEach(l => console.log('  ', l.trim()));
}

// 4. Buscar tarjetas de producto o handlers de "Comprar" / "Ver"
console.log('\n4. Buscando componentes de tarjetas de producto o botones de compra:');
const productCards = searchFiles('src', /(ProductCard|ProductoCard|catalogo|catalog)/i);
productCards.forEach(f => {
  try {
    const c = fs.readFileSync(f, 'utf8');
    if (/handleAddToCart|addToCart|onBuy|onView|Comprar|sugerencia|suggestion/i.test(c)) {
      console.log(`  -> Match en ${f}`);
    }
  } catch(e) {}
});

// 5. Historial reciente de git sobre catálogo y sugerencias
console.log('\n5. Historial reciente de Git en catálogo y sugerencias:');
try {
  const log = execSync('git log -n 12 --oneline -- src/').toString();
  console.log(log.trim());
} catch(e) {
  console.log('No se pudo leer git log:', e.message);
}

console.log('\n=== FIN DIAGNÓSTICO PRELIMINAR ===');
