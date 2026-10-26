const fs = require('fs');
const path = require('path');

console.log("=== 1. SISTEMA DE TOASTS EN EL PROYECTO ===");
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const toastPkgs = Object.keys(pkg.dependencies || {}).concat(Object.keys(pkg.devDependencies || {})).filter(p => p.includes('toast') || p.includes('sonner'));
  console.log("Dependencias de toast encontradas:", toastPkgs);
} catch (e) {
  console.log("Error leyendo package.json:", e.message);
}

try {
  const inbox = fs.readFileSync('src/modules/solicitudes-negocio/components/admin-inbox.tsx', 'utf8');
  const toastImports = inbox.split('\n').filter(l => l.includes('toast') || l.includes('Sonner') || l.includes('alert'));
  console.log("Imports relacionados con toast en admin-inbox.tsx:", toastImports);
} catch (e) {
  console.log("Error leyendo admin-inbox.tsx:", e.message);
}

console.log("\n=== 2. ARCHIVOS EN src/lib/ ===");
try {
  if (fs.existsSync('src/lib')) {
    console.log("Archivos en src/lib:", fs.readdirSync('src/lib'));
  } else {
    console.log("src/lib no existe directamente.");
  }
} catch (e) {
  console.log("Error leyendo src/lib:", e.message);
}

console.log("\n=== 3. FRAGMENTO ACTUAL DE DESCARGA EN admin-inbox.tsx ===");
try {
  const inbox = fs.readFileSync('src/modules/solicitudes-negocio/components/admin-inbox.tsx', 'utf8');
  const lines = inbox.split('\n');
  const start = lines.findIndex(l => l.includes('SECCIÓN DESCARGAR ARCHIVOS'));
  const end = lines.findIndex(l => l.includes('Notificación WhatsApp:'));
  if (start !== -1 && end !== -1) {
    console.log(`Líneas ${start} a ${end}:`);
    console.log(lines.slice(start, end).join('\n'));
  }
} catch (e) {
  console.log("Error extrayendo fragmento:", e.message);
}
