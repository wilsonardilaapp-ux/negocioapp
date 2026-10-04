const fs = require('fs');
const path = require('path');

console.log('=== [PASO 1.2] INSPECCIÓN DETALLADA DE JEV Y FIDELIZACIÓN ===\n');

// 1. Ver cómo está construido JevCopilotWidgetRetencion.tsx o Vencimientos
const widgetFile = fs.existsSync('src/jev/JevCopilotWidgetRetencion.tsx') 
  ? 'src/jev/JevCopilotWidgetRetencion.tsx' 
  : 'src/jev/JevCopilotWidgetVencimientos.tsx';

console.log(`1. Analizando Widget de referencia: ${widgetFile}`);
if (fs.existsSync(widgetFile)) {
  const content = fs.readFileSync(widgetFile, 'utf8');
  console.log('--- Primeras 60 líneas del widget: ---');
  console.log(content.split('\n').slice(0, 60).join('\n'));
}

// 2. Ver contextAggregator de Retencion
const aggFile = 'src/jev/contextAggregatorRetencion.ts';
if (fs.existsSync(aggFile)) {
  console.log(`\n2. Analizando Context Aggregator: ${aggFile}`);
  const content = fs.readFileSync(aggFile, 'utf8');
  console.log('--- Primeras 40 líneas: ---');
  console.log(content.split('\n').slice(0, 40).join('\n'));
}

// 3. Localizar el botón "Recuperar con IA" en ChurnRiskCard o loyalty
const churnCard = 'src/components/admin/loyalty/ChurnRiskCard.tsx';
console.log(`\n3. Analizando botón "Recuperar con IA" en ${churnCard}`);
if (fs.existsSync(churnCard)) {
  const content = fs.readFileSync(churnCard, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    if (/Recuperar con IA|recuperar|churn|campaign|copilot|limit|ia/i.test(l)) {
      console.log(`L${idx+1}: ${l.trim()}`);
    }
  });
  // Imprimir un fragmento relevante de ChurnRiskCard
  console.log('\n--- Estructura de ChurnRiskCard (primeras 50 líneas) ---');
  console.log(lines.slice(0, 50).join('\n'));
}

// 4. Ver servicios o acciones de límite de IA en el proyecto
const aiLimitFiles = [];
function findAiLimit(dir) {
  try {
    for (const f of fs.readdirSync(dir)) {
      if (['node_modules', '.next', '.git'].includes(f)) continue;
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) findAiLimit(full);
      else if (/ai.*limit|copilot.*limit|consumo|atomic/i.test(f)) aiLimitFiles.push(full);
    }
  } catch (e) {}
}
findAiLimit('src');
console.log('\n4. Archivos relacionados con límites de IA encontrados en src:');
aiLimitFiles.forEach(f => console.log('  -', f));

// 5. Ver cómo jevEngineRetencion gestiona el límite / llamada de IA
const engineFile = 'src/jev/jevEngineRetencion.ts';
if (fs.existsSync(engineFile)) {
  console.log(`\n5. Verificando consumo de IA en ${engineFile}:`);
  const content = fs.readFileSync(engineFile, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    if (/limit|consumo|increment|counter|quota|atomic|ai/i.test(l)) {
      console.log(`L${idx+1}: ${l.trim()}`);
    }
  });
}

console.log('\n=== FIN DIAGNÓSTICO DETALLADO ===');
