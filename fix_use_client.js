const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TARGET_FILE = path.join(process.cwd(), 'src/modules/solicitudes-negocio/components/admin-inbox.tsx');

let content = fs.readFileSync(TARGET_FILE, 'utf8');

// Eliminar cualquier 'use client' previo y el import duplicado si existe
content = content.replace(/^import\s+\{\s*downloadFile\s*\}\s+from\s+['"]@\/lib\/downloadFile['"];?\s*/m, '');
content = content.replace(/^['"]use client['"];?\s*/m, '');

// Asegurar que 'use client' sea la primera línea absoluta
const nuevoContenido = `'use client';\n\nimport { downloadFile } from '@/lib/downloadFile';\n` + content.trimStart();

fs.writeFileSync(TARGET_FILE, nuevoContenido, 'utf8');
console.log('✓ "use client" colocado en la primera línea de admin-inbox.tsx');

console.log('--- VALIDACIÓN TYPESCRIPT ---');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✓ TypeScript verificado: 0 ERRORES');
} catch (e) {
  console.error('Error en validación TypeScript.');
}
