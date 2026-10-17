const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

function walk(dir, matchers = [], ignoreDirs = ['node_modules', '.git', '.next', 'dist', 'build', '.turbo'], results = []) {
  try {
    const list = fs.readdirSync(dir);
    for (const item of list) {
      if (ignoreDirs.includes(item)) continue;
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath, matchers, ignoreDirs, results);
      } else {
        const rel = path.relative(ROOT, fullPath);
        const lower = rel.toLowerCase();
        if (matchers.length === 0 || matchers.some(m => lower.includes(m.toLowerCase()))) {
          results.push(rel);
        }
      }
    }
  } catch (e) {}
  return results;
}

function readFileSnippet(filePath, maxLines = 100) {
  try {
    const full = path.join(ROOT, filePath);
    if (!fs.existsSync(full)) return null;
    const content = fs.readFileSync(full, 'utf8');
    const lines = content.split('\n');
    return lines.slice(0, maxLines).join('\n');
  } catch (e) {
    return null;
  }
}

console.log('====================================================');
console.log('🔎 INICIANDO DIAGNÓSTICO: FASE 1 (MARKIX SOCIAL PROOF)');
console.log('====================================================\n');

// 1. ESQUEMAS DE BASE DE DATOS
console.log('--- 1. ESQUEMA DE DATOS ---');
const schemaFiles = walk(ROOT, ['schema.prisma', 'schema.ts', 'database.types.ts', 'drizzle']);
console.log('Archivos de esquema detectados:', schemaFiles);

schemaFiles.forEach(sf => {
  if (sf.endsWith('.prisma')) {
    const content = fs.readFileSync(path.join(ROOT, sf), 'utf8');
    const targetModels = [
      'Product', 'Dish', 'Item',
      'Business', 'Restaurant', 'Store', 'Tenant',
      'Order', 'Sale', 'OrderItem', 'Pedido',
      'Module', 'BusinessModule', 'FeatureFlag', 'Subscription',
      'User', 'Role', 'Account'
    ];
    console.log(`\nModelos clave en ${sf}:`);
    targetModels.forEach(m => {
      const reg = new RegExp(`model\\s+${m}\\s*\\{[\\s\\S]*?\\n\\}`, 'g');
      const match = content.match(reg);
      if (match) {
        console.log(`\n[MODELO: ${m}]`);
        console.log(match[0]);
      }
    });
  }
});

// 2. CATÁLOGO PÚBLICO & VISTA DE CLIENTE
console.log('\n--- 2. RUTAS DE CATÁLOGO PÚBLICO Y GESTIÓN ---');
const catalogRoutes = walk(ROOT, ['catalogo', 'catalog', 'menu', 'producto', 'product', 'dashboard']);
const publicCatalog = catalogRoutes.filter(r => 
  (r.includes('page.') || r.includes('route.')) &&
  (r.includes('catalogo') || r.includes('menu') || r.includes('[') || r.includes('shop') || r.includes('store'))
);
console.log('Rutas candidatas para catálogo público y dashboard:');
publicCatalog.slice(0, 30).forEach(r => console.log('  ->', r));

// 3. MÓDULOS EXISTENTES Y CÓMO ESTÁN ESTRUCTURADOS
console.log('\n--- 3. PATRÓN DE MÓDULOS EXISTENTES ---');
const moduleFiles = walk(ROOT, ['module', 'modulo', 'feature', 'plugin']);
const relevantModuleFiles = moduleFiles.filter(r => !r.includes('.test.') && !r.includes('.spec.'));
console.log('Archivos relacionados con módulos en el código:');
relevantModuleFiles.slice(0, 25).forEach(r => console.log('  ->', r));

// 4. PERMISOS Y ROLES (SuperAdmin vs Dueño)
console.log('\n--- 4. CONTROL DE ACCESO / ROLES / SUPERADMIN ---');
const authFiles = walk(ROOT, ['superadmin', 'role', 'auth', 'permission', 'session', 'middleware']);
const accessFiles = authFiles.filter(r => r.endsWith('.ts') || r.endsWith('.tsx') || r.endsWith('.js'));
console.log('Archivos de control de acceso/roles:');
accessFiles.slice(0, 20).forEach(r => console.log('  ->', r));

// 5. RESUMEN DE DEPENDENCIAS
console.log('\n--- 5. DEPENDENCIAS CLAVE (package.json) ---');
const pkgPath = path.join(ROOT, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  console.log('Dependencias:', Object.keys(pkg.dependencies || {}));
}

console.log('\n✅ Diagnóstico Fase 1 completado. Copia y pega aquí la salida.');
