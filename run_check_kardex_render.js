const fs = require('fs');
const lines = fs.readFileSync('src/app/(dashboard)/dashboard/kardex/page.tsx', 'utf8').split('\n');
console.log(lines.slice(55, 85).map((l, i) => `${i + 56}: ${l}`).join('\n'));
