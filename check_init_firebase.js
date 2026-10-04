const fs = require('fs');
const content = fs.readFileSync('src/firebase/index.ts', 'utf8');
const lines = content.split('\n');
const idx = lines.findIndex(l => l.includes('function initializeFirebase'));
if (idx !== -1) {
  lines.slice(idx, idx + 45).forEach(l => console.log(l));
} else {
  console.log('No encontrada function initializeFirebase en index.ts. Mostrando primeros exports:');
  lines.slice(0, 30).forEach(l => console.log(l));
}
