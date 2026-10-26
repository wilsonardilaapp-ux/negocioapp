const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TARGET_FILE = path.join(process.cwd(), 'src/modules/solicitudes-negocio/components/public-form.tsx');
const BACKUP_FILE = TARGET_FILE + '.bak';

console.log('--- 1. CREANDO RESPALDO DE SEGURIDAD ---');
if (!fs.existsSync(TARGET_FILE)) {
  console.error('ERROR: No se encontró', TARGET_FILE);
  process.exit(1);
}
fs.copyFileSync(TARGET_FILE, BACKUP_FILE);
console.log('✓ Respaldo creado en:', BACKUP_FILE);

let content = fs.readFileSync(TARGET_FILE, 'utf8');

console.log('--- 2. APLICANDO CORRECCIÓN DE REDIRECCIÓN A WHATSAPP ---');

// Identificar y eliminar la declaración de popupWin
content = content.replace(/let popupWin: Window \| null = null;/, '');

// Identificar y eliminar el bloque try...catch de window.open
content = content.replace(/\s*try {\s*popupWin = window.open\('', '_blank'\);\s*}\s*catch \(e\) {\s*console.warn\('Popup bloqueado inicialmente:', e\);\s*}/, '');

// Identificar y eliminar la asignación a popupWin.location.href
content = content.replace(/popupWin\.location\.href = resJson\.whatsappUrl;/, '');


fs.writeFileSync(TARGET_FILE, content, 'utf8');
console.log('✓ Corrección aplicada en:', TARGET_FILE);

console.log('--- 3. VALIDACIÓN DE TIPOS CON TYPESCRIPT ---');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✓ TypeScript verificado: 0 ERRORES');
} catch (e) {
  console.error('ALERTA: Se detectó un error al compilar TypeScript.');
}
