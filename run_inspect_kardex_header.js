const fs = require('fs');

const file = 'src/app/(dashboard)/dashboard/kardex/page.tsx';
if (!fs.existsSync(file)) {
  console.log(`No existe ${file}`);
  process.exit(0);
}

const lines = fs.readFileSync(file, 'utf8').split('\n');
console.log(`Total líneas en ${file}: ${lines.length}`);
console.log('\n--- Primeras 55 líneas de kardex/page.tsx ---');
console.log(lines.slice(0, 55).map((l, i) => `${i + 1}: ${l}`).join('\n'));
