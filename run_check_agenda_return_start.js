const fs = require('fs');

const file = 'src/components/reservas/AgendaGrid.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

for (let i = 150; i < 210; i++) {
  if (lines[i] && lines[i].includes('return (')) {
    console.log('--- Comienzo del render en AgendaGrid.tsx ---');
    console.log(lines.slice(i, i + 25).join('\n'));
    break;
  }
}
