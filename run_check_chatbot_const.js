const fs = require('fs');

const file = 'src/components/public-menu-chatbot/ChatbotMenuConfigContent.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

lines.forEach((line, idx) => {
  if (/PUBLIC_MENU_CHATBOT_MODULE_ID|isModuleAuthorized/i.test(line)) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});
