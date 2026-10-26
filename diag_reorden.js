const fs = require('fs');

const inbox = fs.readFileSync('src/modules/solicitudes-negocio/components/admin-inbox.tsx', 'utf8');
const lines = inbox.split('\n');
const start = lines.findIndex(l => l.includes('Canal de Difusión:'));
const end = lines.findIndex(l => l.includes('SECCIÓN DESCARGAR ARCHIVOS'));

if (start !== -1 && end !== -1) {
  console.log("=== BLOQUE ACTUAL DE DATOS ===");
  console.log(lines.slice(start - 1, end).join('\n'));
}
