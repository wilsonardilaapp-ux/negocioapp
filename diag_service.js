const fs = require('fs');

console.log("=== 1. RESTO DE route.ts (manejo de archivos y creación) ===");
try {
  const route = fs.readFileSync('src/app/api/solicitudes-negocio/route.ts', 'utf8');
  console.log(route.slice(1500, 4500));
} catch (e) {
  console.log(e.message);
}

console.log("\n=== 2. uploadArchivoSeguro Y Storage en solicitudes-service.ts ===");
try {
  const service = fs.readFileSync('src/modules/solicitudes-negocio/services/solicitudes-service.ts', 'utf8');
  const lines = service.split('\n');
  const uploadIdx = lines.findIndex(l => l.includes('uploadArchivoSeguro'));
  if (uploadIdx !== -1) {
    console.log("Fragmento uploadArchivoSeguro:");
    console.log(lines.slice(Math.max(0, uploadIdx - 5), uploadIdx + 60).join('\n'));
  } else {
    console.log("uploadArchivoSeguro no encontrado por nombre exacto en líneas.");
    console.log("Primeras 60 líneas de solicitudes-service.ts:");
    console.log(lines.slice(0, 60).join('\n'));
  }
} catch (e) {
  console.log(e.message);
}

console.log("\n=== 3. RESTO DE types.ts ===");
try {
  const types = fs.readFileSync('src/modules/solicitudes-negocio/types.ts', 'utf8');
  console.log(types.slice(1400, 3000));
} catch (e) {
  console.log(e.message);
}
