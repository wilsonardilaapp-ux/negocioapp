const fs = require('fs');

console.log("=== 1. PANTALLA DE ÉXITO EN public-form.tsx ===");
try {
  const form = fs.readFileSync('src/modules/solicitudes-negocio/components/public-form.tsx', 'utf8');
  const lines = form.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('successData') || l.includes('setSuccess') || l.includes('¡Solicitud enviada') || l.includes('confirmationMessage')) {
      console.log(`Línea ${i + 1}: ${l}`);
    }
  });
} catch (e) {
  console.log("Error:", e.message);
}

console.log("\n=== 2. RESUMEN MENSAJE WA EN solicitudes-service.ts ===");
try {
  const serv = fs.readFileSync('src/modules/solicitudes-negocio/services/solicitudes-service.ts', 'utf8');
  const lines = serv.split('\n');
  const idx = lines.findIndex(l => l.includes('resumenMensajeWa ='));
  if (idx !== -1) {
    console.log(lines.slice(idx, idx + 25).join('\n'));
  }
} catch (e) {
  console.log("Error:", e.message);
}

console.log("\n=== 3. TARJETA EN admin-inbox.tsx ===");
try {
  const inbox = fs.readFileSync('src/modules/solicitudes-negocio/components/admin-inbox.tsx', 'utf8');
  const lines = inbox.split('\n');
  const start = lines.findIndex(l => l.includes('Canal de Difusión:'));
  const end = lines.findIndex(l => l.includes('SECCIÓN DESCARGAR ARCHIVOS'));
  if (start !== -1 && end !== -1) {
    console.log(lines.slice(start - 1, end).join('\n'));
  }
} catch (e) {
  console.log("Error:", e.message);
}
