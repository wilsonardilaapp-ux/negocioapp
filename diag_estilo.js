const fs = require('fs');

console.log("=== 1. BUSCANDO REEMPLAZO DE VARIABLES EN whatsapp-service.ts ===");
try {
  const ws = fs.readFileSync('src/modules/solicitudes-negocio/services/whatsapp-service.ts', 'utf8');
  console.log(ws.slice(0, 1800));
} catch (e) {
  console.log("Error leyendo whatsapp-service.ts:", e.message);
}

console.log("\n=== 2. TEXTO DE VARIABLES EN admin-editor.tsx ===");
try {
  const ed = fs.readFileSync('src/modules/solicitudes-negocio/components/admin-editor.tsx', 'utf8');
  const lines = ed.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('Plantilla WhatsApp') || l.includes('{comprobante}')) {
      console.log(`Línea ${i + 1}: ${l}`);
    }
  });
} catch (e) {
  console.log("Error leyendo admin-editor.tsx:", e.message);
}

console.log("\n=== 3. ZONA DE admin-inbox.tsx DONDE ESTÁ 'Creación de Recursos solicitada' ===");
try {
  const inbox = fs.readFileSync('src/modules/solicitudes-negocio/components/admin-inbox.tsx', 'utf8');
  const lines = inbox.split('\n');
  const idx = lines.findIndex(l => l.includes('Creación de Recursos solicitada'));
  if (idx !== -1) {
    console.log(lines.slice(idx - 5, idx + 15).join('\n'));
  }
} catch (e) {
  console.log("Error leyendo admin-inbox.tsx:", e.message);
}
