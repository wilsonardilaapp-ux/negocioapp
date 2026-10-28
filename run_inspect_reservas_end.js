const fs = require('fs');
const lines = fs.readFileSync('src/app/(dashboard)/dashboard/reservas/layout.tsx', 'utf8').split('\n');
console.log(lines.slice(60).join('\n'));
