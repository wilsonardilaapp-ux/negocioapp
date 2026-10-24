const fs = require('fs');

const content = fs.readFileSync('src/app/(admin)/superadmin/payment-methods/page.tsx', 'utf8');
const lines = content.split('\n');
console.log('--- LÍNEAS 120 A 240 DE payment-methods/page.tsx ---');
console.log(lines.slice(120, 240).join('\n'));
