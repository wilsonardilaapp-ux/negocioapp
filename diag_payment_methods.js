const fs = require('fs');
const path = require('path');

function searchFiles(dir, match) {
  let res = [];
  try {
    fs.readdirSync(dir).forEach(f => {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) res.push(...searchFiles(full, match));
      else if (match.test(full)) res.push(full);
    });
  } catch (e) {}
  return res;
}

console.log('==============================================');
console.log('DIAGNÓSTICO: /superadmin/payment-methods');
console.log('==============================================');

// 1. Archivos en /superadmin/payment-methods
const pmFiles = searchFiles('src/app/(admin)/superadmin/payment-methods', /\.(tsx|jsx|ts|js)$/);
console.log('\n--- [1] ARCHIVOS EN /superadmin/payment-methods ---');
console.log(pmFiles);

// 2. Si existe el page principal, leer contenido
const mainPage = 'src/app/(admin)/superadmin/payment-methods/page.tsx';
if (fs.existsSync(mainPage)) {
  const content = fs.readFileSync(mainPage, 'utf8');
  console.log(`\n--- [2] PRIMERAS 120 LÍNEAS DE ${mainPage} ---`);
  console.log(content.split('\n').slice(0, 120).join('\n'));
}

// 3. Buscar modelos o acciones relacionadas con payment-methods
const actionFiles = searchFiles('src/actions', /payment|pasarela/i);
console.log('\n--- [3] ACCIONES RELACIONADAS EN src/actions ---');
console.log(actionFiles);

// 4. Buscar modelos relacionados en src/models
const modelFiles = searchFiles('src/models', /payment|gateway/i);
console.log('\n--- [4] MODELOS RELACIONADOS EN src/models ---');
console.log(modelFiles);

console.log('==============================================');
