const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

console.log('====================================================');
console.log('🔍 DIAGNÓSTICO: FLUJO DE SESIÓN Y LOGIN');
console.log('====================================================\n');

// 1. Localizar dónde está el texto "Verificando sesión"
function searchInFiles(dir, needle) {
  const matches = [];
  function rec(d) {
    try {
      const items = fs.readdirSync(d);
      for (const item of items) {
        if (['node_modules', '.git', '.next', 'dist', 'build'].includes(item)) continue;
        const full = path.join(d, item);
        if (fs.statSync(full).isDirectory()) {
          rec(full);
        } else if (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.js')) {
          const content = fs.readFileSync(full, 'utf8');
          if (content.toLowerCase().includes(needle.toLowerCase())) {
            matches.push(path.relative(ROOT, full));
          }
        }
      }
    } catch (e) {}
  }
  rec(dir);
  return matches;
}

const found = searchInFiles(ROOT, 'Verificando sesión');
console.log('Archivos que contienen "Verificando sesión":', found);

found.forEach(filePath => {
  console.log(`\n--- Contenido relevante en ${filePath} ---`);
  const lines = fs.readFileSync(path.join(ROOT, filePath), 'utf8').split('\n');
  const idx = lines.findIndex(l => l.toLowerCase().includes('verificando sesión'));
  if (idx !== -1) {
    const start = Math.max(0, idx - 20);
    const end = Math.min(lines.length, idx + 25);
    console.log(lines.slice(start, end).map((l, i) => `${start + 1 + i}: ${l}`).join('\n'));
  }
});

// 2. Revisar el hook useUser o provider de autenticación
const userFiles = searchInFiles(path.join(ROOT, 'src'), 'isUserLoading');
console.log('\nArchivos que manejan isUserLoading:', userFiles.slice(0, 5));

userFiles.slice(0, 3).forEach(filePath => {
  if (filePath.includes('firebase') || filePath.includes('auth') || filePath.includes('context')) {
    console.log(`\n--- Código de carga de usuario en ${filePath} ---`);
    const content = fs.readFileSync(path.join(ROOT, filePath), 'utf8');
    const lines = content.split('\n');
    const idx = lines.findIndex(l => l.includes('onAuthStateChanged') || l.includes('isUserLoading'));
    if (idx !== -1) {
      console.log(lines.slice(Math.max(0, idx - 10), Math.min(lines.length, idx + 35)).join('\n'));
    }
  }
});

// 3. Revisar si hay un middleware de Next.js
const middlewareFiles = ['middleware.ts', 'middleware.js', 'src/middleware.ts', 'src/middleware.js'];
middlewareFiles.forEach(m => {
  if (fs.existsSync(path.join(ROOT, m))) {
    console.log(`\n--- Middleware encontrado: ${m} ---`);
    const content = fs.readFileSync(path.join(ROOT, m), 'utf8');
    console.log(content.split('\n').slice(0, 35).join('\n'));
  }
});

