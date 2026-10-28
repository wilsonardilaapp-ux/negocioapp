const fs = require('fs');

const file = 'src/app/(dashboard)/dashboard/loyalty/page.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

for (let i = 240; i < 330; i++) {
  if (lines[i] && lines[i].includes('return (')) {
    console.log('--- Comienzo del render en dashboard/loyalty/page.tsx ---');
    console.log(lines.slice(i, i + 35).map((l, idx) => `${idx + i + 1}: ${l}`).join('\n'));
    break;
  }
}
