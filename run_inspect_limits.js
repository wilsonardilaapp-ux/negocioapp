const fs = require('fs');
const path = require('path');

function readSnippet(filePath, maxLines = 100) {
  try {
    if (!fs.existsSync(filePath)) return `[ARCHIVO NO ENCONTRADO: ${filePath}]`;
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    return lines.slice(0, maxLines).join('\n');
  } catch (e) {
    return `[ERROR LEYENDO ${filePath}: ${e.message}]`;
  }
}

function findInFile(filePath, regexList) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    const matched = {};
    for (const [key, reg] of Object.entries(regexList)) {
      matched[key] = reg.test(content);
    }
    return matched;
  } catch (e) {
    return null;
  }
}

console.log('====================================================');
console.log('   1. MODELO HYBRID-PLAN (LÍMITES Y MÓDULOS)');
console.log('====================================================');
console.log(readSnippet('src/models/hybrid-plan.ts', 120));

console.log('\n====================================================');
console.log('   2. HOOK / SERVICIO useSubscription.ts');
console.log('====================================================');
console.log(readSnippet('src/hooks/useSubscription.ts', 120));

console.log('\n====================================================');
console.log('   3. VALIDACIÓN DE LÍMITES EN LANDING PAGE');
console.log('====================================================');
// Buscamos dónde está "1 / 1" o lógica de límites en landing-page
const landingPageContent = readSnippet('src/app/(dashboard)/dashboard/landing-page/page.tsx', 100);
console.log('--- dashboard/landing-page/page.tsx ---');
console.log(landingPageContent.slice(0, 1500));

console.log('\n====================================================');
console.log('   4. PÁGINAS A EVALUAR (IMPORTACIÓN Y USO DE LÍMITES)');
console.log('====================================================');

const pagesToAnalyze = [
  { name: 'Catálogo', file: 'src/app/(dashboard)/dashboard/catalogo/page.tsx' },
  { name: 'Catálogo (raíz)', file: 'src/app/(dashboard)/catalogo/page.tsx' },
  { name: 'POS', file: 'src/app/(dashboard)/dashboard/pos/page.tsx' },
  { name: 'Pedidos', file: 'src/app/(dashboard)/dashboard/pedidos/page.tsx' },
  { name: 'Blog', file: 'src/app/(dashboard)/dashboard/blog/page.tsx' },
  { name: 'Blog Create', file: 'src/app/(dashboard)/dashboard/blog/create/page.tsx' },
  { name: 'Cupones (Fidelización)', file: 'src/app/(dashboard)/dashboard/cupones/page.tsx' },
  { name: 'Promociones (Fidelización)', file: 'src/app/(dashboard)/dashboard/promotions/page.tsx' },
  { name: 'Sugerencias (Fidelización)', file: 'src/app/(dashboard)/dashboard/suggestions/page.tsx' },
  { name: 'Chatbot', file: 'src/app/(dashboard)/dashboard/chatbot/page.tsx' },
  { name: 'Chatbot Menú Config', file: 'src/app/(dashboard)/dashboard/configuracion/chatbot-menu/page.tsx' },
  { name: 'Chatbot Menú Content Component', file: 'src/components/public-menu-chatbot/ChatbotMenuConfigContent.tsx' },
  { name: 'Kardex (Inventario)', file: 'src/app/(dashboard)/dashboard/kardex/page.tsx' },
  { name: 'Vencimientos (Inventario)', file: 'src/app/(dashboard)/dashboard/vencimientos/page.tsx' },
  { name: 'Reservas Compartir', file: 'src/app/(dashboard)/dashboard/reservas/compartir/page.tsx' },
  { name: 'Reservas Servicios', file: 'src/app/(dashboard)/dashboard/reservas/servicios/page.tsx' },
  { name: 'YCloud Config', file: 'src/app/(dashboard)/dashboard/configuracion/ycloud/page.tsx' }
];

for (const p of pagesToAnalyze) {
  if (fs.existsSync(p.file)) {
    const content = fs.readFileSync(p.file, 'utf8');
    const hasUseSub = content.includes('useSubscription');
    const hasLimit = /limit|max|plan|quota|upgrade|planLimits|technicalLimits/i.test(content);
    const hasModuleCheck = /module|hasAccess|isModuleEnabled|canAccess/i.test(content);
    console.log(`\n• [${p.name}] (${p.file}):`);
    console.log(`   - Usa useSubscription: ${hasUseSub}`);
    console.log(`   - Menciona límites/plan/upgrade: ${hasLimit}`);
    console.log(`   - Valida módulo: ${hasModuleCheck}`);
    
    // Extraer coincidencias de líneas relevantes
    const lines = content.split('\n');
    const limitLines = lines.filter(l => /subscription|limit|plan|upgrade|permitid/i.test(l) && !l.includes('import')).slice(0, 4);
    if (limitLines.length > 0) {
      console.log('   - Muestras de líneas:', limitLines.map(l => l.trim()).join(' | '));
    }
  } else {
    console.log(`\n• [${p.name}]: No existe archivo ${p.file}`);
  }
}

console.log('\n====================================================');
console.log('   5. RESERVAS, WHAPI, DIRECTORIO Y DEMÁS PÁGINAS');
console.log('====================================================');
function listSubfiles(dir) {
  try {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { recursive: true }).filter(f => /\.(tsx|jsx|ts|js)$/.test(f));
  } catch(e) { return []; }
}
console.log('Archivos en dashboard/reservas:');
console.log(listSubfiles('src/app/(dashboard)/dashboard/reservas'));

console.log('\nArchivos relacionados con Whapi/YCloud/Directorio en dashboard:');
const dashFiles = fs.readdirSync('src/app/(dashboard)/dashboard', { recursive: true }).filter(f => /whapi|directorio|review|valorac/i.test(f));
console.log(dashFiles);

console.log('\n====================================================');
console.log('   6. REGLAS DE FIRESTORE (firestore.rules)');
console.log('====================================================');
if (fs.existsSync('firestore.rules')) {
  const fr = fs.readFileSync('firestore.rules', 'utf8');
  const hasLimitRules = /limit|count|plan|subscription/i.test(fr);
  console.log('¿firestore.rules tiene validación de límites/planes?:', hasLimitRules);
  if (hasLimitRules) {
    const lines = fr.split('\n').filter(l => /limit|plan|subscription/i.test(l));
    console.log('Líneas coincidentes:', lines.slice(0, 10));
  }
}

console.log('\n====================================================');
console.log('   7. ACCIONES DE BACKEND (src/actions) CON LIMITES');
console.log('====================================================');
try {
  const actionFiles = fs.readdirSync('src/actions').filter(f => /\.(ts|js)$/.test(f));
  for (const af of actionFiles) {
    const actContent = fs.readFileSync(path.join('src/actions', af), 'utf8');
    if (/subscription|limit|plan|quota/i.test(actContent)) {
      console.log(`- src/actions/${af} menciona subscription/limit`);
    }
  }
} catch(e) { console.log('Error leyendo src/actions:', e.message); }

