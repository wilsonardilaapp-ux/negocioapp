const fs = require('fs');
const content = fs.readFileSync('src/components/layout/super-admin-nav.tsx', 'utf8');
const lines = content.split('\n');

const startIndex = lines.findIndex(l => l.includes('/superadmin/solicitudes-negocio'));
console.log('--- LÍNEAS ALREDEDOR DE SOLICITUDES ---');
console.log(lines.slice(Math.max(0, startIndex - 2), startIndex + 4).join('\n'));
