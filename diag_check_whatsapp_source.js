const fs = require('fs');

const content = fs.readFileSync('src/modules/solicitudes-negocio/services/solicitudes-service.ts', 'utf8');
const lines = content.split('\n');

console.log('--- BUSCANDO CONSTRUCCIÓN DE RESUMEN WHATSAPP ---');
const startIdx = content.indexOf('const resumenMensajeWa = [');
if (startIdx !== -1) {
  console.log(content.slice(startIdx, startIdx + 800));
} else {
  console.log('No se encontró const resumenMensajeWa');
}
