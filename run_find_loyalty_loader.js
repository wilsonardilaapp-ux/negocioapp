const fs = require('fs');

const file = 'src/app/(dashboard)/dashboard/loyalty/page.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

lines.forEach((l, i) => {
  if (l.includes('Cargando inteligencia de clientes')) {
    console.log(`L${i+1}: ${l}`);
    console.log('--- Contexto (5 líneas antes y después) ---');
    console.log(lines.slice(Math.max(0, i - 4), i + 6).map((line, idx) => `${i - 3 + idx}: ${line}`).join('\n'));
  }
});
