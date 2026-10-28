const fs = require('fs');

const file = 'src/components/reservas/AgendaGrid.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

console.log('--- Botón Nueva Reserva (L235-L255) ---');
console.log(lines.slice(234, 255).join('\n'));

console.log('\n--- Botón Agendar Primera Cita (L320-L335) ---');
console.log(lines.slice(319, 335).join('\n'));
