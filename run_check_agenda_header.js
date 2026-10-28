const fs = require('fs');

const file = 'src/components/reservas/AgendaGrid.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

console.log('--- Líneas 205 a 245 de AgendaGrid.tsx ---');
console.log(lines.slice(204, 245).join('\n'));
