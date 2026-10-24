const fs = require('fs');

console.log('==============================================');
console.log('DIAGNÓSTICO: EMOJIS EN WHATSAPP');
console.log('==============================================');

const service = fs.readFileSync('src/modules/solicitudes-negocio/services/solicitudes-service.ts', 'utf8');
const lines = service.split('\n');
lines.forEach((l, i) => {
  if (l.includes('resumenMensajeWa') || l.includes('whatsappMessageTemplate') || l.includes('wa.me')) {
    console.log(`service.ts L${i + 1}: ${l.trim()}`);
  }
});

console.log('==============================================');
