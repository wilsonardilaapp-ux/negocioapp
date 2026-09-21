const fs = require('fs');
const path = require('path');

const KEYWORDS = [
  'hybrid-billing',
  'hybrid-plans',
  'Panel de Cobros Masivos',
  'Listado de Facturación',
  'subscription-plans',
  'Tarifa Base Mensual',
  'Enviar Cobro',
  'Dishes',
  'Platos'
];

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', '.cache'];

function searchDir(dir, matches = []) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!IGNORE_DIRS.includes(file)) {
          searchDir(fullPath, matches);
        }
      } else if (/\.(jsx?|tsx?|vue|svelte)$/i.test(file)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const found = KEYWORDS.filter(kw => content.includes(kw));
          if (found.length > 0) {
            matches.push({
              path: fullPath.replace(/\\/g, '/'),
              keywords: found
            });
          }
        } catch (e) {}
      }
    }
  } catch (e) {}
  return matches;
}

console.log('🔍 Escaneando proyecto para Fase 0...\n');
const results = searchDir(process.cwd());

if (results.length === 0) {
  console.log('⚠️ No se encontraron coincidencias directas. Listando carpetas en src:');
  try {
    console.log(fs.readdirSync(path.join(process.cwd(), 'src')));
  } catch(e) {
    console.log(fs.readdirSync(process.cwd()));
  }
} else {
  console.log('=== ARCHIVOS ENCONTRADOS RELACIONADOS CON LAS PANTALLAS ===\n');
  results.forEach(r => {
    console.log(`📁 ${r.path}`);
    console.log(`   Coincidencias: ${r.keywords.join(', ')}\n`);
  });
}
