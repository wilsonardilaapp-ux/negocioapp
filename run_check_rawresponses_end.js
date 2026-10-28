const fs = require('fs');
const lines = fs.readFileSync('src/components/public-menu-chatbot/ChatbotMenuConfigContent.tsx', 'utf8').split('\n');
console.log(lines.slice(173, 185).map((l, i) => `${i + 174}: ${l}`).join('\n'));
