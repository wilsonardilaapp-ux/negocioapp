const fs = require('fs');

const file = 'src/models/public-menu-chatbot.ts';
if (fs.existsSync(file)) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (/PUBLIC_MENU_CHATBOT_MODULE_ID/i.test(l)) {
      console.log(`L${i+1}: ${l.trim()}`);
    }
  });
}
