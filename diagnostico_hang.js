const fs = require('fs');

console.log('=== INSPECCIÓN DE ESTADO DE CARGA ===\n');

// 1. Buscar el texto "Sincronizando sesión y perfil"
function searchString(dir, str) {
  for (const f of fs.readdirSync(dir)) {
    if (['node_modules', '.next', '.git'].includes(f)) continue;
    const full = `${dir}/${f}`;
    try {
      if (fs.statSync(full).isDirectory()) searchString(full, str);
      else {
        const c = fs.readFileSync(full, 'utf8');
        if (c.includes(str)) console.log(`Encontrado texto en: ${full}`);
      }
    } catch(e){}
  }
}
searchString('src', 'Sincronizando sesión y perfil');

// 2. Primeras 60 líneas de loyalty/page.tsx
const pagePath = 'src/app/(dashboard)/dashboard/loyalty/page.tsx';
if (fs.existsSync(pagePath)) {
  console.log(`\n--- Primeras 60 líneas de ${pagePath} ---`);
  const lines = fs.readFileSync(pagePath, 'utf8').split('\n');
  lines.slice(0, 60).forEach((l, i) => console.log(`L${i+1}: ${l}`));
}

// 3. Revisar si hay un archivo page.tsx.bak original o diferencias
if (fs.existsSync(`${pagePath}.bak`)) {
  console.log(`\n--- Primeras 40 líneas de ${pagePath}.bak ---`);
  fs.readFileSync(`${pagePath}.bak`, 'utf8').split('\n').slice(0, 40).forEach((l, i) => console.log(`L${i+1}: ${l}`));
}

console.log('\n=== FIN INSPECCIÓN ===');
