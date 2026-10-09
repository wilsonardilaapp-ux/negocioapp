const fs = require('fs');
const path = require('path');

console.log('🔍 [DIAGNÓSTICO] Analizando botón "Generar con IA" y flujo de SEO...\n');

const createPage = path.join('src', 'app', '(admin)', 'superadmin', 'blog', 'create', 'page.tsx');

if (fs.existsSync(createPage)) {
  const content = fs.readFileSync(createPage, 'utf8');
  const lines = content.split('\n');

  console.log(`📄 Archivo: ${createPage}`);
  
  // 1. Buscar sección Configuración SEO y botón
  console.log('\n--- 1. Sección Configuración SEO y Botón ---');
  lines.forEach((line, idx) => {
    if (/Configuración SEO|Generar con IA|generateSeo|generate-seo|seo/i.test(line)) {
      console.log(`  Línea ${idx + 1}: ${line}`);
    }
  });

  // Mostrar bloque detallado alrededor de "Generar con IA"
  const btnIdx = lines.findIndex(l => l.includes('Generar con IA') || l.includes('Generar SEO'));
  if (btnIdx !== -1) {
    console.log(`\n--- Bloque del botón (Líneas ${btnIdx - 5} a ${btnIdx + 20}) ---`);
    for (let i = Math.max(0, btnIdx - 6); i < Math.min(lines.length, btnIdx + 25); i++) {
      console.log(`  ${i + 1}: ${lines[i]}`);
    }
  }

  // 2. Buscar handlers relacionados con SEO o IA en este archivo
  console.log('\n--- 2. Funciones de SEO / IA en la página ---');
  lines.forEach((line, idx) => {
    if (/const handle|function handle|const generate|function generate/i.test(line) && /seo|ai|ia/i.test(line)) {
      console.log(`  Línea ${idx + 1}: ${line}`);
      for (let i = idx; i < Math.min(lines.length, idx + 25); i++) {
        console.log(`    ${i + 1}: ${lines[i]}`);
      }
    }
  });
} else {
  console.log(`❌ No se encontró ${createPage}`);
}

// 3. Buscar endpoints o flujos de IA para SEO en todo el proyecto
console.log('\n--- 3. Flujos / Endpoints / Server Actions de IA para SEO en src/ ---');
function searchAiFlows(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', '.next', '.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      searchAiFlows(full);
    } else if (/\.(ts|tsx|js)$/.test(entry.name)) {
      const c = fs.readFileSync(full, 'utf8');
      if (/generate.*seo|seo.*generate|seoFlow|generateSeoMetadata/i.test(c)) {
        console.log(`  📌 Coincidencia en: ${full}`);
      }
    }
  }
}
searchAiFlows('src');

