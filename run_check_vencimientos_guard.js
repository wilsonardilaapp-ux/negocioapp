const fs = require('fs');

const file = 'src/app/(dashboard)/dashboard/vencimientos/page.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

lines.forEach((l, i) => {
  if (/isAuthorized|isSubLoading/i.test(l)) {
    console.log(`L${i+1}: ${l.trim()}`);
  }
});

console.log('\n--- Búsqueda de retorno temprano con isAuthorized ---');
for (let i = 45; i < 150; i++) {
  if (lines[i] && lines[i].includes('if (!isAuthorized)')) {
    console.log(lines.slice(i - 2, i + 25).join('\n'));
    break;
  }
}
