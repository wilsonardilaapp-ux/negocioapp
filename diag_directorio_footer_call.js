const fs = require('fs');

const content = fs.readFileSync('src/app/(public)/directorio/page.tsx', 'utf8');
const lines = content.split('\n');

const footerIndex = lines.findIndex(l => l.includes('<Footer'));
if (footerIndex !== -1) {
  console.log('--- LLAMADA A <Footer> EN /directorio/page.tsx ---');
  console.log(lines.slice(footerIndex, footerIndex + 3).join('\n'));
} else {
  console.log('No se encontró <Footer> en /directorio/page.tsx');
}
