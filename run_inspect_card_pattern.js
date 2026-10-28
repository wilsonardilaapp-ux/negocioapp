const fs = require('fs');

const cupones = fs.readFileSync('src/app/(dashboard)/dashboard/cupones/page.tsx', 'utf8');
const lines = cupones.split('\n');
console.log('--- Patrón de Bloqueo de Módulo en Cupones (L170-L190) ---');
console.log(lines.slice(170, 192).join('\n'));

console.log('\n--- Reservas layout.tsx (Líneas 30 a 65) ---');
const layout = fs.readFileSync('src/app/(dashboard)/dashboard/reservas/layout.tsx', 'utf8');
console.log(layout.split('\n').slice(30, 65).join('\n'));
