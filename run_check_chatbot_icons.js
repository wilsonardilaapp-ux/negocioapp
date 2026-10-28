const fs = require('fs');

const file = 'src/components/public-menu-chatbot/ChatbotMenuConfigContent.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

for (let i = 0; i < 70; i++) {
  if (lines[i].includes('lucide-react')) {
    console.log(lines.slice(i, i + 15).join('\n'));
    break;
  }
}
