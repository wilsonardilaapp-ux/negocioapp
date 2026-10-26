const fs = require('fs');

console.log("=== BUSCANDO LLAMADAS A enviarWhatsAppSolicitud ===");
try {
  const service = fs.readFileSync('src/modules/solicitudes-negocio/services/solicitudes-service.ts', 'utf8');
  const lines = service.split('\n');
  const idx = lines.findIndex(l => l.includes('enviarWhatsAppSolicitud'));
  if (idx !== -1) {
    console.log(lines.slice(Math.max(0, idx - 10), idx + 35).join('\n'));
  } else {
    console.log("No encontrado en solicitudes-service.ts");
  }
} catch (e) {
  console.log("Error:", e.message);
}
