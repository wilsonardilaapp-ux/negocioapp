const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TARGET_FILE = path.join(process.cwd(), 'src/modules/solicitudes-negocio/components/admin-inbox.tsx');

let content = fs.readFileSync(TARGET_FILE, 'utf8');

content = content.replace(
  'const cleanFileName = (url, fallback) => {',
  'const cleanFileName = (url?: string, fallback: string = ""): string => {'
);

fs.writeFileSync(TARGET_FILE, content, 'utf8');
console.log('✓ Tipado estricto aplicado en cleanFileName');

console.log('--- VALIDACIÓN DE TIPOS CON TYPESCRIPT ---');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✓ TypeScript verificado: 0 ERRORES');
} catch (e) {
  console.error('Error persistente en TypeScript.');
}
