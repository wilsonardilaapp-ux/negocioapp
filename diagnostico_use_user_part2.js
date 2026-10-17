const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const useUserFile = path.join(ROOT, 'src/firebase/auth/use-user.tsx');
const lines = fs.readFileSync(useUserFile, 'utf8').split('\n');

console.log('--- LÍNEAS 110 A 170 DE src/firebase/auth/use-user.tsx ---');
console.log(lines.slice(110, 170).map((l, i) => `${111 + i}: ${l}`).join('\n'));
