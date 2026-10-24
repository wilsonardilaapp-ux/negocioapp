const fs = require('fs');
const path = require('path');

const IGNORE_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', '.firebase', '.cache', 'coverage']);

function listDir(dir, maxDepth = 2, currentDepth = 0) {
  if (currentDepth > maxDepth) return [];
  let entries = [];
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      if (IGNORE_DIRS.has(item)) continue;
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        entries.push({ type: 'dir', path: full, depth: currentDepth });
        entries.push(...listDir(full, maxDepth, currentDepth + 1));
      } else {
        entries.push({ type: 'file', path: full, depth: currentDepth });
      }
    }
  } catch (e) {}
  return entries;
}

function searchKeywordsInCode(dir, keywords, maxMatches = 15) {
  let matches = [];
  function walk(d) {
    if (matches.length >= maxMatches) return;
    try {
      const items = fs.readdirSync(d);
      for (const item of items) {
        if (IGNORE_DIRS.has(item)) continue;
        const full = path.join(d, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          walk(full);
        } else if (/\.(js|jsx|ts|tsx|json|sql|prisma)$/.test(item)) {
          const content = fs.readFileSync(full, 'utf8');
          for (const kw of keywords) {
            if (content.toLowerCase().includes(kw.toLowerCase())) {
              matches.push({ file: full, keyword: kw });
              if (matches.length >= maxMatches) return;
              break;
            }
          }
        }
      }
    } catch (e) {}
  }
  walk(dir);
  return matches;
}

console.log('====================================');
console.log('DIAGNÓSTICO AUTOMÁTICO - MARKIX');
console.log('====================================');

// 1. package.json
let pkg = null;
if (fs.existsSync('package.json')) {
  try {
    pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    console.log('\n--- [1] DEPENDENCIAS CLAVE ---');
    console.log('Name:', pkg.name);
    console.log('Dependencies:', Object.keys(pkg.dependencies || {}));
    console.log('DevDependencies:', Object.keys(pkg.devDependencies || {}));
  } catch (e) {
    console.log('Error leyendo package.json:', e.message);
  }
} else {
  console.log('No se encontró package.json en la raíz actual.');
}

// 2. Estructura de carpetas
console.log('\n--- [2] ESTRUCTURA DE ARCHIVOS (Top 2 niveles) ---');
const tree = listDir('.', 2);
tree.filter(t => t.depth <= 1).forEach(t => {
  console.log(`${'  '.repeat(t.depth)}${t.type === 'dir' ? '📁' : '📄'} ${t.path}`);
});

// 3. Detección de WhatsApp / WHAPI
console.log('\n--- [3] BÚSQUEDA DE WHATSAPP / WHAPI ---');
const whapiMatches = searchKeywordsInCode('.', ['whapi', 'whatsapp', 'asistente'], 10);
console.log(whapiMatches);

// 4. Detección de SuperAdmin / Notificaciones / Storage
console.log('\n--- [4] BÚSQUEDA DE ADMIN, NOTIFICACIONES Y STORAGE ---');
const adminMatches = searchKeywordsInCode('.', ['superadmin', 'super_admin', 'super-admin', 'notification', 'notificacion', 'upload', 'multer', 's3', 'cloudinary'], 15);
console.log(adminMatches);

// 5. Detección de Prisma o Esquemas DB
console.log('\n--- [5] ARCHIVOS DE BD / ESQUEMAS DETECTADOS ---');
const dbFiles = tree.filter(t => 
  t.path.includes('prisma') || 
  t.path.includes('migrations') || 
  t.path.endsWith('.sql') || 
  t.path.includes('schema') || 
  t.path.includes('database') ||
  t.path.includes('drizzle')
).map(t => t.path);
console.log(dbFiles);

console.log('\n====================================');
console.log('FIN DEL DIAGNÓSTICO');
console.log('====================================');
