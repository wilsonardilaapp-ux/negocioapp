const fs = require('fs');

console.log('=== INSPECCIÓN DE USE_USER Y REDIRECCIÓN ===\n');
const content = fs.readFileSync('src/firebase/auth/use-user.tsx', 'utf8');
const lines = content.split('\n');

// Mostrar los 3 useEffects
lines.forEach((line, idx) => {
  if (line.includes('useEffect(') || line.includes('// 1.') || line.includes('// 2.') || line.includes('// 3.')) {
    console.log(`L${idx+1}: ${line}`);
    lines.slice(idx, idx + 15).forEach((sub, sidx) => console.log(`   ${sub}`));
  }
});
