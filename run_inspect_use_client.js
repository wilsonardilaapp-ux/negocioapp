const fs = require('fs');

function checkFirstLines(file) {
  console.log(`\n--- ${file} (Primeras 8 líneas) ---`);
  if (!fs.existsSync(file)) return console.log('No existe');
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  console.log(lines.slice(0, 8).map((l, i) => `${i + 1}: ${l}`).join('\n'));
}

checkFirstLines('src/app/(dashboard)/dashboard/kardex/page.tsx');
checkFirstLines('src/app/(dashboard)/dashboard/reservas/layout.tsx');
