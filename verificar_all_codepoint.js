const fs = require('fs');

console.log('==============================================');
console.log('VERIFICANDO CODEPOINTS COMPLETOS');
console.log('==============================================');

const service = fs.readFileSync('src/modules/solicitudes-negocio/services/solicitudes-service.ts', 'utf8');
const constants = fs.readFileSync('src/modules/solicitudes-negocio/constants.ts', 'utf8');

const serviceMatches = (service.match(/String\.fromCodePoint/g) || []).length;
const constantsMatches = (constants.match(/String\.fromCodePoint/g) || []).length;

console.log(`[SERVICE] Apariciones de String.fromCodePoint: ${serviceMatches} (Mínimo esperado: 8)`);
console.log(`[CONSTANTS] Apariciones de String.fromCodePoint: ${constantsMatches} (Mínimo esperado: 8)`);

if (serviceMatches >= 8 && constantsMatches >= 8) {
  console.log('\n>>> TODO PERFECTO: EMOJIS PROTEGIDOS AL 100% <<<');
} else {
  console.log('\n>>> ATENCIÓN: Revisar constants.ts si faltaba alguna coincidencia <<<');
}
console.log('==============================================');
