const fs = require('fs');

console.log('--- 1. MODELO BUSINESS (Campos de Plan) ---');
try {
  const b = fs.readFileSync('src/models/business.ts', 'utf8');
  console.log(b.slice(0, 1000));
} catch(e) { console.log('Error business:', e.message); }

console.log('\n--- 2. MODELO O FORMULARIO DE PRODUCTO ---');
try {
  const p = fs.readFileSync('src/components/catalogo/product-form.tsx', 'utf8');
  console.log(p.slice(0, 800));
} catch(e) { console.log('Error product-form:', e.message); }

console.log('\n--- 3. MIGRATIONS.TS EXISTENTE ---');
try {
  const m = fs.readFileSync('src/actions/migrations.ts', 'utf8');
  console.log(m.slice(0, 600));
} catch(e) { console.log('Error migrations:', e.message); }
