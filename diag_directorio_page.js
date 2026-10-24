const fs = require('fs');

console.log('--- CONTENIDO DE src/app/(public)/directorio/page.tsx ---');
const content = fs.readFileSync('src/app/(public)/directorio/page.tsx', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(0, 50).join('\n'));
