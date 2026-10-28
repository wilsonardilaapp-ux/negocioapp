const fs = require('fs');

function inspect(file) {
  console.log(`\n====================================================`);
  console.log(`ARCHIVO: ${file}`);
  console.log(`====================================================`);
  if (!fs.existsSync(file)) return console.log('No existe el archivo.');
  const content = fs.readFileSync(file, 'utf8');
  console.log(content.slice(0, 1500));
}

inspect('src/app/(dashboard)/dashboard/configuracion/chatbot-menu/page.tsx');
inspect('src/components/public-menu-chatbot/ChatbotMenuConfigContent.tsx');
