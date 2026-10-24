const fs = require('fs');

console.log('==============================================');
console.log('VERIFICANDO STRING.FROMCODEPOINT');
console.log('==============================================');

const service = fs.readFileSync('src/modules/solicitudes-negocio/services/solicitudes-service.ts', 'utf8');
const constants = fs.readFileSync('src/modules/solicitudes-negocio/constants.ts', 'utf8');

console.log(`[SERVICE] Usa String.fromCodePoint: ${service.includes('String.fromCodePoint') ? 'SÍ' : 'NO'}`);
console.log(`[CONSTANTS] Usa String.fromCodePoint: ${constants.includes('String.fromCodePoint') ? 'SÍ' : 'NO'}`);

console.log('==============================================');
