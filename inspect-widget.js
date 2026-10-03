const fs = require('fs');
try {
  const content = fs.readFileSync('src/jev/JevCopilotWidgetWhatsapp.tsx', 'utf8');
  const lines = content.split('\n');
  lines.slice(0, 60).forEach((l, i) => console.log(`L${i+1}: ${l}`));
} catch(e) { console.log(e.message); }
