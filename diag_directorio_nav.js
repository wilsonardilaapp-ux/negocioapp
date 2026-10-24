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
console.log('DIAGNÓSTICO: Menú de /directorio vs /registro-negocio');
console.log('==============================================');

// 1. Buscar archivos de directorio
const dirFiles = searchFiles('src/app', /directorio/i);
console.log('\n--- [1] ARCHIVOS DE /directorio EN src/app ---');
console.log(dirFiles);

// 2. Revisar src/app/(public)/layout.tsx si existe
if (fs.existsSync('src/app/(public)/layout.tsx')) {
  console.log('\n--- [2] CONTENIDO DE src/app/(public)/layout.tsx ---');
  console.log(fs.readFileSync('src/app/(public)/layout.tsx', 'utf8'));
} else {
  console.log('\n--- [2] NO EXISTE src/app/(public)/layout.tsx ---');
}

// 3. Revisar src/components/layout/public-nav.tsx
if (fs.existsSync('src/components/layout/public-nav.tsx')) {
  console.log('\n--- [3] EXTRACTO DE src/components/layout/public-nav.tsx (Primeras 45 líneas) ---');
  console.log(fs.readFileSync('src/components/layout/public-nav.tsx', 'utf8').split('\n').slice(0, 45).join('\n'));
}

// 4. Si encontramos el page.tsx de directorio, ver su contenido
if (dirFiles.length > 0) {
  const pageFile = dirFiles.find(f => f.endsWith('page.tsx'));
  if (pageFile) {
    console.log(`\n--- [4] PRIMERAS 40 LÍNEAS DE ${pageFile} ---`);
    console.log(fs.readFileSync(pageFile, 'utf8').split('\n').slice(0, 40).join('\n'));
  }
}

// 5. Ver estado actual de /registro-negocio/page.tsx
if (fs.existsSync('src/app/(public)/registro-negocio/page.tsx')) {
  console.log('\n--- [5] CONTENIDO ACTUAL DE src/app/(public)/registro-negocio/page.tsx ---');
  console.log(fs.readFileSync('src/app/(public)/registro-negocio/page.tsx', 'utf8'));
}

console.log('==============================================');
