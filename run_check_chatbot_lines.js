const fs = require('fs');

const file = 'src/components/public-menu-chatbot/ChatbotMenuConfigContent.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

console.log('--- Líneas 125 a 145 ---');
console.log(lines.slice(124, 145).join('\n'));

console.log('\n--- Líneas 575 a 595 ---');
console.log(lines.slice(574, 595).join('\n'));
