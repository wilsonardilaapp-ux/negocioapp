const fs = require('fs');

const content = fs.readFileSync('src/app/(public)/directorio/page.tsx', 'utf8');
const lines = content.split('\n');

const headerIndex = lines.findIndex(l => l.includes('<Header'));
console.log('--- LLAMADA A <Header> EN /directorio/page.tsx ---');
console.log(lines.slice(Math.max(0, headerIndex - 20), headerIndex + 5).join('\n'));
