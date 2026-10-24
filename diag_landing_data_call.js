const fs = require('fs');

const content = fs.readFileSync('src/app/(public)/directorio/page.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((l, idx) => {
  if (l.includes('landingData') || l.includes('getLandingData')) {
    console.log(`Línea ${idx + 1}: ${l}`);
  }
});
