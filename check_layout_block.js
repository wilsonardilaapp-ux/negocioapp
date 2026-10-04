const fs = require('fs');
const content = fs.readFileSync('src/app/(dashboard)/layout.tsx', 'utf8');
const lines = content.split('\n');
console.log('--- LÍNEAS 110 A 160 DE layout.tsx ---');
lines.slice(110, 160).forEach((l, i) => console.log(`L${i+111}: ${l}`));
