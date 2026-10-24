const fs = require('fs');

const content = fs.readFileSync('src/modules/solicitudes-negocio/components/public-form.tsx', 'utf8');
const lines = content.split('\n');

for (let i = 394; i < Math.min(lines.length, 425); i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
