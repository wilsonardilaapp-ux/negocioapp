const fs = require('fs');
const path = require('path');

const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', '.firebase', '.cache'];

function searchFiles(dir, matchFn, results = []) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE_DIRS.includes(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        searchFiles(fullPath, matchFn, results);
      } else if (entry.isFile() && /\.(js|jsx|ts|tsx|json|rules)$/.test(entry.name)) {
        if (matchFn(fullPath, entry.name)) {
          results.push(fullPath);
        }
      }
    }
  } catch (e) {}
  return results;
}

function searchContent(files, patterns) {
  const matches = {};
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      for (const [key, regex] of Object.entries(patterns)) {
        if (regex.test(content)) {
          if (!matches[key]) matches[key] = [];
          matches[key].push(file);
        }
      }
    } catch (e) {}
  }
  return matches;
}

console.log('====================================================');
console.log('   INICIANDO DIAGNÓSTICO DE PLANES HÍBRIDOS Y LÍMITES');
console.log('====================================================\n');

// 1. Archivos relacionados con hybrid-plans y superadmin
const hybridPlanFiles = searchFiles(process.cwd(), (p) => /hybrid-plan|superadmin/i.test(p));
console.log('--- 1. ARCHIVOS HYBRID-PLANS / SUPERADMIN ---');
hybridPlanFiles.forEach(f => console.log('  -', f.replace(process.cwd(), '')));

// 2. Archivos del constructor de Landing Page
const landingFiles = searchFiles(process.cwd(), (p) => /landing/i.test(p));
console.log('\n--- 2. ARCHIVOS DE LANDING PAGE ---');
landingFiles.slice(0, 15).forEach(f => console.log('  -', f.replace(process.cwd(), '')));

// 3. Búsqueda de patrones clave en todo el proyecto
const allProjectFiles = searchFiles(process.cwd(), () => true);

const patterns = {
  landingLimitCheck: /1\s*\/\s*1|landingPages|landing_pages/i,
  planLimitsSchema: /technicalLimits|hybridPlans|planLimits|extraLimits/i,
  planHooks: /usePlan|useSubscription|usePlanLimits|useBusinessPlan|useModuleAccess/i,
  firestoreRulesLimits: /firestore\.rules/
};

const patternMatches = searchContent(allProjectFiles, patterns);
console.log('\n--- 3. COINCIDENCIAS DE HOOKS Y SERVICIOS DE PLANES ---');
(patternMatches.planHooks || []).forEach(f => console.log('  -', f.replace(process.cwd(), '')));

console.log('\n--- 4. ARCHIVOS QUE DEFINEN O MANEJAN LÍMITES DE PLAN ---');
(patternMatches.planLimitsSchema || []).slice(0, 15).forEach(f => console.log('  -', f.replace(process.cwd(), '')));

// 5. Ubicación de páginas clave
const targetKeywords = {
  catalogo: /catalog|product/i,
  pos: /pos|terminal/i,
  pedidos: /order|pedidos/i,
  blog: /blog/i,
  fidelizacion: /loyalty|fidelizacion|coupon|cupon|promotion|promocion|suggestion|sugerencia/i,
  chatbot: /chatbot|compartir.*menu|share.*menu/i,
  inventario_kardex: /kardex|inventory|inventario|expiration|vencimiento/i,
  reservas: /booking|reserva|appointment|citas/i,
  whapi: /whapi/i,
  ycloud: /ycloud/i,
  directorio: /directory|directorio|review|valoracion/i
};

console.log('\n--- 5. RUTAS Y ARCHIVOS ASOCIADOS A LAS PÁGINAS A EVALUAR ---');
for (const [key, regex] of Object.entries(targetKeywords)) {
  const matches = allProjectFiles.filter(p => regex.test(p) && /\.(tsx|jsx|ts|js)$/.test(p) && !p.includes('.test.') && !p.includes('.spec.'));
  console.log(`\n• [${key.toUpperCase()}]:`);
  matches.slice(0, 5).forEach(f => console.log('   ', f.replace(process.cwd(), '')));
}

// 6. Revisión de Backend / Reglas
console.log('\n--- 6. REGLAS Y FUNCIONES BACKEND ---');
const backendFiles = allProjectFiles.filter(p => /(firestore\.rules|functions\/src|pages\/api|app\/api)/i.test(p));
backendFiles.slice(0, 15).forEach(f => console.log('  -', f.replace(process.cwd(), '')));

console.log('\n====================================================');
console.log('   FIN DEL RECONOCIMIENTO INICIAL');
console.log('====================================================');
