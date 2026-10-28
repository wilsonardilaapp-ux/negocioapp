const fs = require('fs');

const file = 'src/components/public-menu-chatbot/ChatbotMenuConfigContent.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

lines.forEach((l, i) => {
  if (/Nueva Respuesta|Agregar Pregunta|Crear Respuesta|setIsAddModalOpen|handleOpenAdd/i.test(l)) {
    console.log(`L${i+1}: ${l.trim()}`);
  }
});
