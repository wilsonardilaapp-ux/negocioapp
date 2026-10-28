const fs = require('fs');
const lines = fs.readFileSync('src/components/public-menu-chatbot/ChatbotMenuConfigContent.tsx', 'utf8').split('\n');
console.log(lines.slice(724, 745).join('\n'));
