const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TARGET_FILE = path.join(process.cwd(), 'src/modules/solicitudes-negocio/components/public-form.tsx');

let content = fs.readFileSync(TARGET_FILE, 'utf8');

// Eliminar cualquier referencia residual a popupWin
content = content.replace(/if\s*\(\s*popupWin\s*&&[\s\S]*?popupWin\.close\(\);/g, '');
content = content.replace(/if\s*\(\s*popupWin\s*&&[\s\S]*?\{\s*popupWin\.location\.href\s*=\s*resJson\.whatsappUrl;\s*\}\s*else\s*\{/g, '{');
content = content.replace(/if\s*\(\s*popupWin\s*&&[\s\S]*?\{\s*\}/g, '');

// Asegurar que si hay resJson.whatsappUrl redirija directamente
const redirectPattern = /if\s*\(\s*resJson\.whatsappUrl\s*\)\s*\{[\s\S]*?window\.location\.href\s*=\s*resJson\.whatsappUrl;[\s\S]*?\}/;
if (content.match(redirectPattern)) {
  content = content.replace(redirectPattern, `if (resJson.whatsappUrl) {\n        window.location.href = resJson.whatsappUrl;\n      }`);
}

fs.writeFileSync(TARGET_FILE, content, 'utf8');
console.log('✓ Referencias a popupWin eliminadas.');

console.log('--- VALIDACIÓN DE TIPOS CON TYPESCRIPT ---');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✓ TypeScript verificado: 0 ERRORES');
} catch (e) {
  console.log('--- MOSTRANDO LÍNEAS 240 A 285 PARA AJUSTE EXACTO ---');
  const lines = fs.readFileSync(TARGET_FILE, 'utf8').split('\n');
  console.log(lines.slice(240, 285).join('\n'));
}
