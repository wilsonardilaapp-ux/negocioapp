const fs = require('fs');

const file = 'src/components/public-menu-chatbot/ChatbotMenuConfigContent.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

console.log('--- Líneas 125 a 175 de ChatbotMenuConfigContent.tsx ---');
console.log(lines.slice(124, 175).map((l, i) => `${i + 125}: ${l}`).join('\n'));
