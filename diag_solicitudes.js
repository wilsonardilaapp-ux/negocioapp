const fs = require('fs');
const path = require('path');

const IGNORE_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', '.firebase'];

function findFiles(dir, matchPatterns, results = []) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE_DIRS.includes(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        findFiles(fullPath, matchPatterns, results);
      } else if (entry.isFile()) {
        const matches = matchPatterns.some(pat => fullPath.toLowerCase().includes(pat.toLowerCase()));
        if (matches) results.push(fullPath);
      }
    }
  } catch (e) {}
  return results;
}

console.log("=== 1. BUSCANDO ARCHIVOS DE PÁGINA Y DETALLE ===");
const pageFiles = findFiles(process.cwd(), ['solicitudes-negocio', 'solicitudes']);
console.log("Archivos encontrados para solicitudes-negocio:", pageFiles);

console.log("\n=== 2. VERIFICANDO ENDPOINT Y STORAGE ===");
const endpointPath = path.join(process.cwd(), 'src/app/api/servicios-configuracion/submit/route.ts');
console.log("Existe src/app/api/servicios-configuracion/submit/route.ts?:", fs.existsSync(endpointPath));

const storageFiles = findFiles(process.cwd(), ['storage', 'firebaseadmin', 'firebase-admin', 'upload']);
console.log("Archivos relacionados con Storage / Admin:", storageFiles.slice(0, 15));

console.log("\n=== 3. CONTENIDO CLAVE EN EL PANEL DE SOLICITUDES ===");
// Busquemos dónde aparece "Canal de Difusión" o "Descargar Comprobante"
function searchContent(dir, phrases, found = []) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORE_DIRS.includes(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        searchContent(fullPath, phrases, found);
      } else if (entry.isFile() && /\.(tsx|jsx|ts|js)$/.test(entry.name)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const phrase of phrases) {
            if (content.includes(phrase)) {
              found.push({ file: fullPath, phrase });
              break;
            }
          }
        } catch (e) {}
      }
    }
  } catch (e) {}
  return found;
}

const hits = searchContent(process.cwd(), ['Canal de Difusión', 'Descargar Comprobante']);
console.log("Archivos que contienen 'Canal de Difusión' o 'Descargar Comprobante':", hits);

console.log("\n=== 4. EXTRACCIÓN DE CABECERA/IMPORTS DEL ENDPOINT (SI EXISTE) ===");
if (fs.existsSync(endpointPath)) {
  const content = fs.readFileSync(endpointPath, 'utf8');
  console.log("Líneas 1 a 60 del endpoint:");
  console.log(content.split('\n').slice(0, 60).join('\n'));
}

console.log("\n--- DIAGNÓSTICO FINALIZADO ---");
