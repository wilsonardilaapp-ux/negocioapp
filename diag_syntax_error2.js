const fs = require('fs');

const content = fs.readFileSync('src/modules/solicitudes-negocio/components/public-form.tsx', 'utf8');
const lines = content.split('\n');

console.log('--- LÍNEAS 210 A 250 DE public-form.tsx ---');
for (let i = 209; i < Math.min(lines.length, 250); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
