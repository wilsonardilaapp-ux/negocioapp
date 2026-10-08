const fs = require('fs');
const path = require('path');

console.log('=== [PASO 1] DIAGNÓSTICO: BLOG PROFESIONAL EN SUPERADMIN ===\n');

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

// 1. Localizar la página de superadmin blog
const blogFiles = searchFiles('src', /superadmin.*blog.*page\.(tsx|jsx)$/i);
console.log('1. Archivos encontrados para /superadmin/blog:');
blogFiles.forEach(f => console.log('  -', f));

const mainBlogPage = blogFiles[0];

if (mainBlogPage && fs.existsSync(mainBlogPage)) {
  console.log(`\n2. Inspección del archivo principal: ${mainBlogPage}`);
  const content = fs.readFileSync(mainBlogPage, 'utf8');
  const lines = content.split('\n');

  console.log('--- Imports de UI y datos en la página: ---');
  lines.filter(l => /import.*from/i.test(l)).slice(0, 20).forEach(l => console.log('  ', l.trim()));

  // 3. Cómo se cargan los posts
  console.log('\n--- Carga y estado de los Posts: ---');
  lines.forEach((l, i) => {
    if (/posts|articles|blog|useCollection|useDoc|fetch|getDocs/i.test(l)) {
      if (i < 90) console.log(`  L${i+1}: ${l.trim()}`);
    }
  });

  // 4. Ubicación de la sección "Publicaciones" y la tabla
  console.log('\n--- Estructura de la tarjeta "Publicaciones": ---');
  const cardIdx = lines.findIndex(l => l.includes('Publicaciones') || l.includes('Listado de todos'));
  if (cardIdx !== -1) {
    lines.slice(Math.max(0, cardIdx - 2), cardIdx + 35).forEach((l, i) => console.log(`  L${cardIdx - 2 + i + 1}: ${l}`));
  }
}

// 5. Verificar componentes UI disponibles (Input, Select, Button)
console.log('\n5. Componentes de UI existentes en @/components/ui/:');
const uiComponents = ['input', 'select', 'button', 'badge', 'card', 'table'];
uiComponents.forEach(c => {
  const p = path.join('src', 'components', 'ui', `${c}.tsx`);
  console.log(`  - ${c}.tsx:`, fs.existsSync(p) ? '✅ Existe' : '❌ No existe');
});

console.log('\n=== FIN DIAGNÓSTICO PRELIMINAR ===');
