const fs = require('fs');

console.log('=== [PASO 1.4] ANÁLISIS DE REGLAS, CAMPOS Y RENDERIZADO DEL MODAL ===\n');

// 1. Ver modelo SuggestionRule
const modelFile = 'src/models/suggestion-rule.ts';
if (fs.existsSync(modelFile)) {
  console.log(`1. Modelo en ${modelFile}:`);
  console.log(fs.readFileSync(modelFile, 'utf8'));
}

// 2. Ver cómo guarda las reglas rule-form.tsx en el Dashboard
const formFile = 'src/components/suggestions/rule-form.tsx';
if (fs.existsSync(formFile)) {
  console.log(`\n2. Guardado de reglas en ${formFile}:`);
  const lines = fs.readFileSync(formFile, 'utf8').split('\n');
  lines.forEach((l, i) => {
    if (/active|trigger|suggested|collection.*suggestion/i.test(l)) {
      console.log(`L${i+1}: ${l.trim()}`);
    }
  });
}

// 3. Ver cómo lista las reglas rule-list.tsx
const listFile = 'src/components/suggestions/rule-list.tsx';
if (fs.existsSync(listFile)) {
  console.log(`\n3. Consulta de reglas en ${listFile}:`);
  const lines = fs.readFileSync(listFile, 'utf8').split('\n');
  lines.forEach((l, i) => {
    if (/active|trigger|where|orderBy/i.test(l)) {
      console.log(`L${i+1}: ${l.trim()}`);
    }
  });
}

// 4. Ver si <SuggestionModal está renderizado en catalog/[businessId]/page.tsx
const catalogPage = 'src/app/(public)/catalog/[businessId]/page.tsx';
if (fs.existsSync(catalogPage)) {
  console.log(`\n4. Verificando JSX de SuggestionModal en ${catalogPage}:`);
  const content = fs.readFileSync(catalogPage, 'utf8');
  const modalMatches = content.split('\n').filter(l => l.includes('<SuggestionModal'));
  console.log('Ocurrencias de <SuggestionModal en JSX:', modalMatches);
  if (modalMatches.length === 0) {
    console.log('⚠️ ¡ALERTA! <SuggestionModal /> NO está siendo renderizado en el JSX de la página del catálogo.');
  }
}

// 5. Ver qué hace fix-hyphen-id.js si existe
if (fs.existsSync('fix-hyphen-id.js')) {
  console.log('\n5. Contenido de fix-hyphen-id.js:');
  console.log(fs.readFileSync('fix-hyphen-id.js', 'utf8').slice(0, 1000));
}

// 6. Ver el resto de suggestion-flow.ts
const flowFile = 'src/ai/flows/suggestion-flow.ts';
if (fs.existsSync(flowFile)) {
  console.log('\n6. Resto de suggestion-flow.ts (paso 3 y retorno):');
  const lines = fs.readFileSync(flowFile, 'utf8').split('\n');
  lines.slice(50, 110).forEach(l => console.log(l));
}

console.log('\n=== FIN DIAGNÓSTICO FASE 4 ===');
