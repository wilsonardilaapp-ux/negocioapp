const fs = require('fs');

const file = 'src/components/public-menu-chatbot/ChatbotMenuConfigContent.tsx';
if (!fs.existsSync(file)) {
  console.log(`No existe: ${file}`);
  process.exit(0);
}

const lines = fs.readFileSync(file, 'utf8').split('\n');
console.log('--- Líneas 65 a 80 de ChatbotMenuConfigContent.tsx ---');
console.log(lines.slice(65, 80).map((l, i) => `${i + 66}: ${l}`).join('\n'));
