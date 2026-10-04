const fs = require('fs');

console.log('=== [PASO 1] DIAGNÓSTICO INTEGRAL: MATCH, METRICS Y JEV ===\n');

// 1. Ver cómo update-suggestion-metrics-flow actualiza la BD
const metricsPath = 'src/ai/flows/update-suggestion-metrics-flow.ts';
if (fs.existsSync(metricsPath)) {
  console.log(`1. Contenido completo de ${metricsPath}:`);
  console.log(fs.readFileSync(metricsPath, 'utf8'));
}

// 2. Ver cómo contextAggregatorSuggestions lee las métricas en JEV
const jevPath = 'src/jev/contextAggregatorSuggestions.ts';
if (fs.existsSync(jevPath)) {
  console.log(`\n2. Cómo lee JEV las métricas en ${jevPath}:`);
  const lines = fs.readFileSync(jevPath, 'utf8').split('\n');
  lines.forEach((l, i) => {
    if (/metrics|timesShown|timesAccepted|conversion|revenue/i.test(l)) {
      console.log(`L${i+1}: ${l.trim()}`);
    }
  });
}

// 3. Ver cómo se generan y guardan los IDs de productos en product-form
const prodFormPath = 'src/components/catalogo/product-form.tsx';
if (fs.existsSync(prodFormPath)) {
  console.log(`\n3. Generación de IDs en ${prodFormPath}:`);
  const lines = fs.readFileSync(prodFormPath, 'utf8').split('\n');
  lines.forEach((l, i) => {
    if (/doc\(collection\(.*products|id:\s*product/i.test(l)) {
      console.log(`L${i+1}: ${l.trim()}`);
    }
  });
}

// 4. Ver cómo sync-suggestion-analytics calcula las métricas
const syncPath = 'src/ai/flows/sync-suggestion-analytics.ts';
if (fs.existsSync(syncPath)) {
  console.log(`\n4. Contenido de ${syncPath}:`);
  console.log(fs.readFileSync(syncPath, 'utf8').slice(0, 1500));
}

console.log('\n=== FIN DIAGNÓSTICO INTEGRAL ===');
