const fs = require('fs');

const file = 'src/components/public-menu-chatbot/ChatbotMenuConfigContent.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

console.log('--- Líneas 540 a 575 en ChatbotMenuConfigContent.tsx ---');
console.log(lines.slice(539, 575).join('\n'));
