const fs = require('fs');

const file = 'src/components/reservas/AgendaGrid.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

console.log('--- Líneas 40 a 70 de AgendaGrid.tsx ---');
console.log(lines.slice(39, 70).join('\n'));
