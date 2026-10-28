const fs = require('fs');

const file = 'src/app/(dashboard)/dashboard/pedidos/page.tsx';
if (!fs.existsSync(file)) {
  console.log(`No existe el archivo: ${file}`);
  process.exit(0);
}

const lines = fs.readFileSync(file, 'utf8').split('\n');
console.log('--- Búsqueda de limits, ordersCount o LimitBanner en pedidos/page.tsx ---');
lines.forEach((line, idx) => {
  if (/limits|ordersCount|limitbanner|canaddorders|límite|alcanzado/i.test(line)) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});
