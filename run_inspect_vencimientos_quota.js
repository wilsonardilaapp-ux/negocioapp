const fs = require('fs');

const file = 'src/app/(dashboard)/dashboard/vencimientos/page.tsx';
if (!fs.existsSync(file)) {
  console.log(`No existe ${file}`);
  process.exit(0);
}

const lines = fs.readFileSync(file, 'utf8').split('\n');
console.log(`Total líneas en ${file}: ${lines.length}`);
console.log('\n--- Uso de useSubscription y batches (L25-L60) ---');
console.log(lines.slice(25, 60).map((l, i) => `${i + 26}: ${l}`).join('\n'));

console.log('\n--- Render del encabezado (alrededor de L225-L255) ---');
for (let i = 215; i < 265; i++) {
  if (lines[i] && lines[i].includes('Control de Vencimientos')) {
    console.log(lines.slice(Math.max(0, i - 4), i + 25).map((l, idx) => `${i - 3 + idx}: ${l}`).join('\n'));
    break;
  }
}
