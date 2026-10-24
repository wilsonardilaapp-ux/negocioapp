const fs = require('fs');

const content = fs.readFileSync('src/modules/solicitudes-negocio/components/public-form.tsx', 'utf8');
const lines = content.split('\n');

console.log('--- LÍNEAS 160 A 210 DE public-form.tsx ---');
for (let i = 159; i < Math.min(lines.length, 210); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
