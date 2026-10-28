const fs = require('fs');

const file = 'src/app/(dashboard)/dashboard/reservas/layout.tsx';
if (!fs.existsSync(file)) {
  console.log(`No existe ${file}`);
  process.exit(0);
}

const lines = fs.readFileSync(file, 'utf8').split('\n');
console.log('--- ReservasLayout en layout.tsx ---');
lines.forEach((l, i) => {
  if (i >= 50) console.log(`L${i + 1}: ${l}`);
});
