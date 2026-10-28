const fs = require('fs');
const lines = fs.readFileSync('src/components/reservas/AgendaGrid.tsx', 'utf8').split('\n');
console.log(lines.slice(70, 85).join('\n'));
