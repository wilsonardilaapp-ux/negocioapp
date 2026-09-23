const fs = require('fs');

console.log('--- MODELO PRODUCT ---');
try {
  console.log(fs.readFileSync('src/models/product.ts', 'utf8').slice(0, 500));
} catch(e) { console.log(e.message); }

console.log('\n--- GUARDADO EN PRODUCT-FORM ---');
try {
  const code = fs.readFileSync('src/components/catalogo/product-form.tsx', 'utf8');
  const lines = code.split('\n');
  lines.forEach(l => {
    if (l.includes('collection(') || l.includes('doc(') || l.includes('addDoc') || l.includes('updateDoc') || l.includes('setDoc')) {
      console.log(l.trim());
    }
  });
} catch(e) { console.log(e.message); }
