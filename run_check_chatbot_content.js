const fs = require('fs');

const file = 'src/components/public-menu-chatbot/ChatbotMenuConfigContent.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

lines.forEach((line, idx) => {
  if (/useSubscription|isModuleAuthorized|módulo|no está activo/i.test(line)) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});
