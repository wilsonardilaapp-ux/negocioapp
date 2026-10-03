const fs = require('fs');
try {
  const content = fs.readFileSync('src/jev/jevEngineWhatsapp.ts', 'utf8');
  const lines = content.split('\n');
  console.log("=== INICIO DE obtenerCopilotoWhatsapp ===");
  lines.slice(25, 85).forEach((l, i) => console.log(`L${i+26}: ${l}`));
} catch(e) { console.log(e.message); }
