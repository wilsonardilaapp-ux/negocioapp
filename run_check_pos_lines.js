const fs = require('fs');
const lines = fs.readFileSync('src/app/(dashboard)/dashboard/pos/page.tsx', 'utf8').split('\n');
console.log(lines.slice(270, 305).join('\n'));
