const fs = require('fs');
if (fs.existsSync('src/components/layout/client-nav.tsx')) {
  const content = fs.readFileSync('src/components/layout/client-nav.tsx', 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (/kardex|directorio|valoracion|review|reserva/i.test(l)) {
      console.log(`L${i+1}: ${l.trim()}`);
    }
  });
}
