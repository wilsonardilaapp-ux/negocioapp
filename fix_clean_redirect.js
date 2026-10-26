const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TARGET_FILE = path.join(process.cwd(), 'src/modules/solicitudes-negocio/components/public-form.tsx');
const BACKUP_FILE = TARGET_FILE + '.bak';

// Restaurar desde el respaldo original
if (fs.existsSync(BACKUP_FILE)) {
  fs.copyFileSync(BACKUP_FILE, TARGET_FILE);
  console.log('✓ Archivo restaurado desde .bak original');
}

let content = fs.readFileSync(TARGET_FILE, 'utf8');

// Ver el bloque handleSubmit original y reemplazarlo de forma limpia
const originalSubmitStart = 'const handleSubmit = async (e: React.FormEvent) => {';
const submitEnd = 'setSubmitting(false);\n    }\n  };';

const startIdx = content.indexOf(originalSubmitStart);
const endIdx = content.indexOf(submitEnd);

if (startIdx === -1 || endIdx === -1) {
  console.error('ERROR: No se pudo localizar el bloque handleSubmit exacto.');
  process.exit(1);
}

// Extraemos todo el submit original
const originalBlock = content.substring(startIdx, endIdx + submitEnd.length);

// Limpiamos popupWin del bloque:
let cleanBlock = originalBlock
  // Eliminar declaración de popupWin
  .replace(/let popupWin:\s*Window\s*\|\s*null\s*=\s*null;[\s\S]*?console\.warn\([^)]*\);\s*\}/, '')
  // Eliminar popupWin.close()
  .replace(/if\s*\(\s*popupWin\s*&&[\s\S]*?popupWin\.close\(\);/g, '')
  // Reemplazar la redirección con popupWin por redirección directa
  .replace(
    /if\s*\(\s*popupWin\s*&&[\s\S]*?popupWin\.location\.href\s*=\s*resJson\.whatsappUrl;[\s\S]*?window\.location\.href\s*=\s*resJson\.whatsappUrl;\s*\}/,
    `window.location.href = resJson.whatsappUrl;`
  );

content = content.replace(originalBlock, cleanBlock);

fs.writeFileSync(TARGET_FILE, content, 'utf8');
console.log('✓ handleSubmit reconstruido limpiamente sin popupWin.');

console.log('--- VALIDACIÓN TYPESCRIPT ---');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✓ TypeScript verificado: 0 ERRORES');
} catch (e) {
  console.log('Error de TypeScript detectado.');
}
