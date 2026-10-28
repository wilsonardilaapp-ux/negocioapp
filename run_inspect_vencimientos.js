const fs = require('fs');

const file = 'src/app/(dashboard)/dashboard/vencimientos/page.tsx';
if (!fs.existsSync(file)) {
  console.log(`No existe ${file}`);
  process.exit(0);
}

const lines = fs.readFileSync(file, 'utf8').split('\n');
console.log(`Total líneas en ${file}: ${lines.length}`);
console.log('\n--- Primeras 60 líneas ---');
console.log(lines.slice(0, 60).join('\n'));

console.log('\n--- Búsqueda de useSubscription o isModuleAuthorized ---');
lines.forEach((l, i) => {
  if (/useSubscription|isModuleAuthorized|alertas-vencimiento|LimitBanner/i.test(l)) {
    console.log(`L${i+1}: ${l.trim()}`);
  }
});
