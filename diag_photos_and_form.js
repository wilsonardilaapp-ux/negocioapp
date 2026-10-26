const fs = require('fs');

console.log("=== 1. MANEJO DE productPhotos EN route.ts ===");
try {
  const route = fs.readFileSync('src/app/api/solicitudes-negocio/route.ts', 'utf8');
  const lines = route.split('\n');
  const idx = lines.findIndex(l => l.includes('productPhotos'));
  if (idx !== -1) {
    console.log(lines.slice(idx, idx + 45).join('\n'));
  }
} catch (e) {
  console.log(e.message);
}

console.log("\n=== 2. CAMPOS ENVIADOS EN public-form.tsx ===");
try {
  const form = fs.readFileSync('src/modules/solicitudes-negocio/components/public-form.tsx', 'utf8');
  const lines = form.split('\n');
  const appendLines = lines.filter(l => l.includes('append(') || l.includes('formData.set('));
  console.log("FormData appends encontrados en public-form.tsx:", appendLines);
} catch (e) {
  console.log(e.message);
}

console.log("\n=== 3. VERIFICACIÓN DE OBJETO GUARDADO EN Firestore ===");
try {
  const route = fs.readFileSync('src/app/api/solicitudes-negocio/route.ts', 'utf8');
  const lines = route.split('\n');
  const callIdx = lines.findIndex(l => l.includes('crearSolicitud('));
  if (callIdx !== -1) {
    console.log(lines.slice(callIdx, callIdx + 30).join('\n'));
  }
} catch (e) {
  console.log(e.message);
}
