const fs = require('fs');

console.log('==============================================');
console.log('VERIFICANDO EMOJIS UNICODE');
console.log('==============================================');

const service = fs.readFileSync('src/modules/solicitudes-negocio/services/solicitudes-service.ts', 'utf8');
const constants = fs.readFileSync('src/modules/solicitudes-negocio/constants.ts', 'utf8');

console.log(`[SERVICE] Usa secuencias Unicode (\\u{...}): ${service.includes('\\u{1F195}') ? 'SÍ' : 'NO'}`);
console.log(`[SERVICE] Usa Array.from para truncado seguro: ${service.includes('Array.from(resumenMensajeWa)') ? 'SÍ' : 'NO'}`);
console.log(`[CONSTANTS] Plantilla con Unicode: ${constants.includes('\\u{1F195}') ? 'SÍ' : 'NO'}`);

console.log('==============================================');
