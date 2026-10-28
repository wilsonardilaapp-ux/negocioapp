const fs = require('fs');
const file = 'src/components/public-menu-chatbot/ChatbotMenuConfigContent.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

lines.forEach((l, i) => {
  if (l.includes('lucide-react')) {
    console.log(`L${i+1}: ${l}`);
  }
});
