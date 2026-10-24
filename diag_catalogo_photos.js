const fs = require('fs');

const content = fs.readFileSync('src/modules/solicitudes-negocio/components/public-form.tsx', 'utf8');
const lines = content.split('\n');

const startIndex = lines.findIndex(l => l.includes('Catálogo de Productos'));
console.log('--- LÍNEAS DEL CAMPO DE FOTOS EN public-form.tsx ---');
for (let i = startIndex; i < startIndex + 55; i++) {
  if (lines[i]) console.log(`${i + 1}: ${lines[i]}`);
}
