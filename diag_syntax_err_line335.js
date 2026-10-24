const fs = require('fs');

const content = fs.readFileSync('src/modules/solicitudes-negocio/components/public-form.tsx', 'utf8');
const lines = content.split('\n');

console.log('--- LÍNEAS 310 A 345 DE public-form.tsx ---');
for (let i = 309; i < Math.min(lines.length, 345); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
