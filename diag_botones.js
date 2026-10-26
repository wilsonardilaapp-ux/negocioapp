const fs = require('fs');

console.log("=== 1. CONTENIDO ACTUAL DE LOS BOTONES EN admin-inbox.tsx ===");
try {
  const inbox = fs.readFileSync('src/modules/solicitudes-negocio/components/admin-inbox.tsx', 'utf8');
  const lines = inbox.split('\n');
  const start = lines.findIndex(l => l.includes('SECCIÓN DESCARGAR ARCHIVOS'));
  const end = lines.findIndex(l => l.includes('Notificación WhatsApp:'));
  if (start !== -1 && end !== -1) {
    console.log(lines.slice(start, end).join('\n'));
  } else {
    console.log("No se encontró el bloque entre 'SECCIÓN DESCARGAR ARCHIVOS' y 'Notificación WhatsApp:'");
  }
} catch (e) {
  console.log("Error leyendo admin-inbox.tsx:", e.message);
}

console.log("\n=== 2. CONTENIDO ACTUAL DE src/lib/downloadFile.ts ===");
try {
  console.log(fs.readFileSync('src/lib/downloadFile.ts', 'utf8'));
} catch (e) {
  console.log("Error leyendo src/lib/downloadFile.ts:", e.message);
}
