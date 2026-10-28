const fs = require('fs');

const file = 'src/components/public-menu-chatbot/ChatbotMenuConfigContent.tsx';
if (!fs.existsSync(file)) {
  console.log(`No existe ${file}`);
  process.exit(0);
}

const lines = fs.readFileSync(file, 'utf8').split('\n');
console.log(`Total líneas en ${file}: ${lines.length}`);
console.log('\n--- Colecciones consultadas en ChatbotMenuConfigContent.tsx ---');
lines.forEach((l, i) => {
  if (/collection\(|useCollection|responses|conversations/i.test(l)) {
    console.log(`L${i+1}: ${l.trim()}`);
  }
});

console.log('\n--- Dónde se renderiza el header (alrededor de L580-L620) ---');
for (let i = 560; i < 620; i++) {
  if (lines[i] && lines[i].includes('Asistente del Menú Público')) {
    console.log(lines.slice(Math.max(0, i - 5), i + 25).map((line, idx) => `${i - 4 + idx}: ${line}`).join('\n'));
    break;
  }
}
