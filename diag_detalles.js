const fs = require('fs');
const path = require('path');

console.log("=== 1. TIPOS EN types.ts ===");
try {
  const typesContent = fs.readFileSync('src/modules/solicitudes-negocio/types.ts', 'utf8');
  console.log(typesContent.slice(0, 1500));
} catch (e) {
  console.log("Error leyendo types.ts:", e.message);
}

console.log("\n=== 2. ENDPOINT src/app/api/solicitudes-negocio/route.ts ===");
try {
  const routeContent = fs.readFileSync('src/app/api/solicitudes-negocio/route.ts', 'utf8');
  console.log(routeContent.slice(0, 2000));
} catch (e) {
  console.log("Error leyendo route.ts:", e.message);
}

console.log("\n=== 3. BUSCAR REFERENCIAS A FIREBASE STORAGE EN EL PROYECTO ===");
function findStorageRefs(dir, found = []) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (['node_modules', '.git', '.next', 'dist', 'build'].includes(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        findStorageRefs(fullPath, found);
      } else if (/\.(ts|tsx|js|json)$/.test(entry.name)) {
        try {
          const c = fs.readFileSync(fullPath, 'utf8');
          if (c.includes('firebase/storage') || c.includes('getStorage') || c.includes('@google-cloud/storage') || c.includes('admin.storage()')) {
            found.push(fullPath);
          }
        } catch(e) {}
      }
    }
  } catch(e) {}
  return found;
}
console.log("Archivos con referencias a Storage:", findStorageRefs('src'));

console.log("\n=== 4. INSPECCIONAR TARJETA DE DETALLE EN admin-inbox.tsx ===");
try {
  const inboxContent = fs.readFileSync('src/modules/solicitudes-negocio/components/admin-inbox.tsx', 'utf8');
  const lines = inboxContent.split('\n');
  const idx = lines.findIndex(l => l.includes('Canal de Difusión'));
  if (idx !== -1) {
    const start = Math.max(0, idx - 25);
    const end = Math.min(lines.length, idx + 45);
    console.log(`Líneas ${start} a ${end} de admin-inbox.tsx:`);
    console.log(lines.slice(start, end).join('\n'));
  } else {
    console.log("'Canal de Difusión' no encontrado directamente en líneas.");
  }
} catch (e) {
  console.log("Error leyendo admin-inbox.tsx:", e.message);
}
