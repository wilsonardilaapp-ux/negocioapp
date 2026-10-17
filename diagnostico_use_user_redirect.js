const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();

const useUserFile = path.join(ROOT, 'src/firebase/auth/use-user.tsx');
if (fs.existsSync(useUserFile)) {
  const lines = fs.readFileSync(useUserFile, 'utf8').split('\n');
  console.log('--- LÍNEAS 40 A 110 DE src/firebase/auth/use-user.tsx ---');
  console.log(lines.slice(40, 110).map((l, i) => `${41 + i}: ${l}`).join('\n'));
} else {
  console.log('No existe use-user.tsx');
}
