const fs = require('fs');
const path = require('path');

console.log('=== [PASO 1] DIAGNÓSTICO: ACCIONES Y PREVIEW EN BLOG ===\n');

// 1. Localizar rutas públicas del blog en src/app
function searchAppRoutes(dir) {
  let routes = [];
  try {
    for (const f of fs.readdirSync(dir)) {
      if (['node_modules', '.next', '.git'].includes(f)) continue;
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) routes = routes.concat(searchAppRoutes(full));
      else if (/blog.*page\.(tsx|jsx)$/i.test(full) && !full.includes('superadmin') && !full.includes('dashboard')) {
        routes.push(full);
      }
    }
  } catch(e) {}
  return routes;
}

console.log('1. Rutas públicas del Blog encontradas:');
const publicBlogRoutes = searchAppRoutes('src/app');
publicBlogRoutes.forEach(r => console.log('  -', r));

// 2. Ver cómo está construido el DropdownMenu en posts-table.tsx
const tablePath = 'src/components/blog/posts-table.tsx';
if (fs.existsSync(tablePath)) {
  console.log(`\n2. Menú actual de acciones en ${tablePath}:`);
  const lines = fs.readFileSync(tablePath, 'utf8').split('\n');
  const dropdownIdx = lines.findIndex(l => l.includes('<DropdownMenu>'));
  if (dropdownIdx !== -1) {
    lines.slice(dropdownIdx, dropdownIdx + 45).forEach((l, i) => console.log(`  L${dropdownIdx + i + 1}: ${l}`));
  }
}

// 3. Verificar disponibilidad de Dialog en @/components/ui/dialog
const dialogPath = 'src/components/ui/dialog.tsx';
console.log(`\n3. Componente Dialog (${dialogPath}):`, fs.existsSync(dialogPath) ? '✅ Disponible' : '❌ No existe');

console.log('\n=== FIN DIAGNÓSTICO ===');
