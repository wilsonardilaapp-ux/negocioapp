const fs = require('fs');

console.log('=== INSPECCIÓN DE src/app/(admin)/superadmin/blog/page.tsx ===\n');

const mainBlogPage = 'src/app/(admin)/superadmin/blog/page.tsx';
if (fs.existsSync(mainBlogPage)) {
  const content = fs.readFileSync(mainBlogPage, 'utf8');
  const lines = content.split('\n');

  console.log('--- Primeras 50 líneas (Imports y Carga de Datos) ---');
  lines.slice(0, 50).forEach((l, i) => console.log(`L${i+1}: ${l}`));

  console.log('\n--- Sección Publicaciones y Tabla (Líneas donde está la Card y Table) ---');
  const cardIdx = lines.findIndex(l => l.includes('Publicaciones') || l.includes('Listado de todos'));
  if (cardIdx !== -1) {
    lines.slice(Math.max(0, cardIdx - 2), cardIdx + 65).forEach((l, i) => console.log(`L${cardIdx - 2 + i + 1}: ${l}`));
  }
}
