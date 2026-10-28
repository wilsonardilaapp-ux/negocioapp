const fs = require('fs');
const lines = fs.readFileSync('src/app/(dashboard)/dashboard/vencimientos/page.tsx', 'utf8').split('\n');
console.log(lines.slice(205, 240).join('\n'));
