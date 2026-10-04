const fs = require('fs');

console.log('=== [PASO 1] DIAGNÓSTICO PROFUNDO DEL MOTOR DE SUGERENCIAS ===\n');

// 1. Ver dónde guarda rule-form.tsx
const formContent = fs.readFileSync('src/components/suggestions/rule-form.tsx', 'utf8');
const formLines = formContent.split('\n');
const saveIdx = formLines.findIndex(l => l.includes('collection(') && l.includes('suggestion'));
console.log('1. Ruta de guardado en rule-form.tsx:');
if (saveIdx !== -1) {
  formLines.slice(Math.max(0, saveIdx - 5), saveIdx + 15).forEach(l => console.log('  ', l.trim()));
}

// 2. Ver dónde lee rule-list.tsx
const listContent = fs.readFileSync('src/components/suggestions/rule-list.tsx', 'utf8');
const listLines = listContent.split('\n');
const queryIdx = listLines.findIndex(l => l.includes('collection(') && l.includes('suggestion'));
console.log('\n2. Ruta de consulta en rule-list.tsx:');
if (queryIdx !== -1) {
  listLines.slice(Math.max(0, queryIdx - 5), queryIdx + 15).forEach(l => console.log('  ', l.trim()));
}

// 3. Ver updateSuggestionMetrics
const metricsFile = 'src/ai/flows/update-suggestion-metrics-flow.ts';
if (fs.existsSync(metricsFile)) {
  console.log(`\n3. Código de ${metricsFile}:`);
  console.log(fs.readFileSync(metricsFile, 'utf8').slice(0, 1500));
}

// 4. Consultar Firestore Admin para ver las reglas reales de "Esmalte Vegano 'Nude'"
async function checkRealRules() {
  try {
    const { getAdminFirestore } = require('./src/firebase/server-init');
    const db = await getAdminFirestore();

    console.log('\n4. Buscando reglas reales en Firestore:');
    
    // Probar colección raíz "suggestionRules"
    const rootSnap = await db.collection('suggestionRules').limit(5).get();
    console.log(`   - En colección raíz 'suggestionRules': ${rootSnap.size} documentos`);
    rootSnap.forEach(d => console.log(`     ID: ${d.id}`, JSON.stringify(d.data())));

    // Probar subcolección en businesses
    const bSnap = await db.collection('businesses').limit(5).get();
    for (const bDoc of bSnap.docs) {
      const subSnap = await db.collection(`businesses/${bDoc.id}/suggestionRules`).get();
      if (!subSnap.empty) {
        console.log(`   - En businesses/${bDoc.id}/suggestionRules: ${subSnap.size} documentos`);
        subSnap.forEach(d => console.log(`     ID: ${d.id}`, JSON.stringify(d.data())));
      }
    }
  } catch(e) {
    console.log('Aviso en consulta Firestore Admin:', e.message);
  }
}

checkRealRules().then(() => console.log('\n=== FIN DIAGNÓSTICO ==='));
