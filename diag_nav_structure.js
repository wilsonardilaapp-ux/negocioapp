const fs = require('fs');

const content = fs.readFileSync('src/components/layout/super-admin-nav.tsx', 'utf8');
const lines = content.split('\n');

console.log('--- LÍNEAS 1 A 70 DE super-admin-nav.tsx ---');
console.log(lines.slice(0, 70).join('\n'));
