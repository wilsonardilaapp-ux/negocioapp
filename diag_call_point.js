const fs = require('fs');

try {
  const service = fs.readFileSync('src/modules/solicitudes-negocio/services/solicitudes-service.ts', 'utf8');
  const lines = service.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('enviarWhatsAppSolicitud(')) {
      console.log(`Llamada en línea ${i + 1}:`);
      console.log(lines.slice(Math.max(0, i - 15), Math.min(lines.length, i + 30)).join('\n'));
    }
  });
} catch (e) {
  console.log("Error:", e.message);
}
