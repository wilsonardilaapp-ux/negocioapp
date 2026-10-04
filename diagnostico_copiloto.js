const fs = require('fs');
const path = require('path');

function searchFiles(dir, filterRegex, ignoreList = ['node_modules', '.next', '.git', 'dist', 'build', '.turbo']) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      if (ignoreList.includes(file)) continue;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results = results.concat(searchFiles(fullPath, filterRegex, ignoreList));
      } else if (filterRegex.test(fullPath)) {
        results.push(fullPath);
      }
    }
  } catch (e) {}
  return results;
}

function searchContent(dir, regex, ignoreList = ['node_modules', '.next', '.git', 'dist', 'build', '.turbo']) {
  const files = searchFiles(dir, /\.(tsx|jsx|ts|js)$/, ignoreList);
  const matches = [];
  for (const f of files) {
    try {
      const content = fs.readFileSync(f, 'utf8');
      if (regex.test(content)) {
        matches.push(f);
      }
    } catch (e) {}
  }
  return matches;
}

console.log('=== [PASO 1] DIAGNÓSTICO DE COPILOTO Y FIDELIZACIÓN ===\n');

// 1. Localizar página de Loyalty
const loyaltyFiles = searchFiles('.', /(loyalty|fidelizacion).*\.(tsx|jsx|ts|js)$/i);
console.log('1. Archivos encontrados para Loyalty/Fidelización:');
loyaltyFiles.forEach(f => console.log('  -', f));

// 2. Localizar páginas de referencia (Retención, Inventario, Vencimientos)
const referencePages = searchFiles('.', /(retention|retencion|inventario|inventory|vencimiento|expiration).*\.(tsx|jsx|ts|js)$/i);
console.log('\n2. Posibles páginas de referencia encontradas:');
referencePages.slice(0, 15).forEach(f => console.log('  -', f));

// 3. Localizar menciones de "Memoria JEV" o Copiloto
const copilotFiles = searchContent('.', /(Memoria JEV|JevCopilot|Copilot|copiloto)/i);
console.log('\n3. Archivos que contienen referencias a Copiloto o "Memoria JEV":');
copilotFiles.slice(0, 15).forEach(f => console.log('  -', f));

// 4. Analizar página de loyalty encontrada
const mainLoyaltyPage = loyaltyFiles.find(f => /dashboard[\/\\]loyalty[\/\\]page\.(tsx|jsx)$/i.test(f)) 
  || loyaltyFiles.find(f => /loyalty.*\.(tsx|jsx)$/i.test(f));

if (mainLoyaltyPage) {
  console.log(`\n4. Inspección de la página principal de Loyalty: ${mainLoyaltyPage}`);
  const content = fs.readFileSync(mainLoyaltyPage, 'utf8');
  console.log(`   - Tamaño: ${content.length} caracteres`);
  
  const lines = content.split('\n');
  const aiLines = [];
  lines.forEach((line, idx) => {
    if (/Recuperar con IA|recuperar|churn|campaign|copilot|ia/i.test(line)) {
      aiLines.push(`L${idx + 1}: ${line.trim()}`);
    }
  });
  console.log('   - Líneas relacionadas con IA / Recuperar / Campañas:');
  console.log(aiLines.slice(0, 30).join('\n'));
}

// 5. Analizar una página de referencia con Copiloto montado
const refWithCopilot = copilotFiles.find(f => 
  /(retention|retencion|inventario|inventory|vencimiento|expiration)/i.test(f) &&
  /page\.(tsx|jsx)$/i.test(f)
);

if (refWithCopilot) {
  console.log(`\n5. Página de referencia con Copiloto montado: ${refWithCopilot}`);
  const content = fs.readFileSync(refWithCopilot, 'utf8');
  const lines = content.split('\n');
  const importLines = lines.filter(l => /import.*(copilot|jev|limit|consumo|ia)/i.test(l));
  console.log('   - Imports relevantes:');
  importLines.forEach(l => console.log('     ', l.trim()));
  
  const copilotUsage = lines.filter(l => /(<.*Copilot|use.*Limit|use.*Ai|increment|verify|onQuery|memoria)/i.test(l));
  console.log('   - Fragmentos de uso:');
  copilotUsage.slice(0, 20).forEach(l => console.log('     ', l.trim()));
}

console.log('\n=== FIN DEL DIAGNÓSTICO PRELIMINAR ===');
