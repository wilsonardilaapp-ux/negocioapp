const fs = require('fs');

const file = 'src/app/(dashboard)/dashboard/valoraciones-directorio/page.tsx';
if (!fs.existsSync(file)) {
  console.log(`No existe ${file}`);
  process.exit(0);
}

const lines = fs.readFileSync(file, 'utf8').split('\n');
console.log(`Total líneas en ${file}: ${lines.length}`);
console.log('\n--- Primeras 50 líneas ---');
console.log(lines.slice(0, 50).join('\n'));

console.log('\n--- Búsqueda de useSubscription o módulos ---');
lines.forEach((l, i) => {
  if (/useSubscription|isModuleAuthorized|directorio|ratings/i.test(l)) {
    console.log(`L${i+1}: ${l.trim()}`);
  }
});
