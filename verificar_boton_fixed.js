const fs = require('fs');

const formContent = fs.readFileSync('src/modules/solicitudes-negocio/components/public-form.tsx', 'utf8');
const lines = formContent.split('\n');
const btnIndex = lines.findIndex(l => l.includes('type="submit"'));
console.log('--- BOTÓN RESULTANTE EN public-form.tsx ---');
console.log(lines.slice(Math.max(0, btnIndex - 1), btnIndex + 16).join('\n'));
