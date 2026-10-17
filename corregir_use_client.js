const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const targetFile = path.join(ROOT, 'src/components/catalogo/public-product-card.tsx');

if (!fs.existsSync(targetFile)) {
  console.error(`❌ No existe ${targetFile}`);
  process.exit(1);
}

let content = fs.readFileSync(targetFile, 'utf8');

// 1. Remover 'use client'; y comillas dobles/simples de donde esté
content = content.replace(/^['"]use client['"];?\s*/m, '');
content = content.replace(/\n['"]use client['"];?\s*/g, '\n');

// 2. Colocar 'use client'; estrictamente en la primera línea
content = `'use client';\n\n` + content.trimStart();

fs.writeFileSync(targetFile, content, 'utf8');

console.log('✅ Corregido: "use client" posicionado en la línea 1 de public-product-card.tsx.');

// Verificación de las primeras 8 líneas
const lines = fs.readFileSync(targetFile, 'utf8').split('\n');
console.log('\n🔍 Verificación de cabecera:');
console.log(lines.slice(0, 8).join('\n'));
