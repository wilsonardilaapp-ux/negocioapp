const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const useUserFile = path.join(ROOT, 'src/firebase/auth/use-user.tsx');
const lines = fs.readFileSync(useUserFile, 'utf8').split('\n');

console.log('--- LÍNEAS 170 A 215 DE src/firebase/auth/use-user.tsx ---');
console.log(lines.slice(170, 215).map((l, i) => `${171 + i}: ${l}`).join('\n'));
