const fs = require('fs');

function inspectSnippet(file, max = 50) {
  if (!fs.existsSync(file)) return console.log(`No existe: ${file}`);
  console.log(`\n====================================================`);
  console.log(`ARCHIVO: ${file}`);
  console.log(`====================================================`);
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  console.log(lines.slice(0, max).join('\n'));
}

inspectSnippet('src/app/(dashboard)/dashboard/kardex/page.tsx', 40);
inspectSnippet('src/app/(dashboard)/dashboard/valoraciones-directorio/page.tsx', 45);
inspectSnippet('src/app/(dashboard)/dashboard/reservas/page.tsx', 35);
