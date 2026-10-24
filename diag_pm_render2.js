const fs = require('fs');

const content = fs.readFileSync('src/app/(admin)/superadmin/payment-methods/page.tsx', 'utf8');
const lines = content.split('\n');
console.log('--- LÍNEAS 240 A 330 DE payment-methods/page.tsx ---');
console.log(lines.slice(240, 330).join('\n'));
