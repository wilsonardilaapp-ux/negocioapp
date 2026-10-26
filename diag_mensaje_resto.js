const fs = require('fs');

try {
  const service = fs.readFileSync('src/modules/solicitudes-negocio/services/solicitudes-service.ts', 'utf8');
  const lines = service.split('\n');
  const idx = lines.findIndex(l => l.includes('resumenMensajeWa ='));
  if (idx !== -1) {
    console.log(lines.slice(idx, idx + 35).join('\n'));
  }
} catch (e) {
  console.log("Error:", e.message);
}
