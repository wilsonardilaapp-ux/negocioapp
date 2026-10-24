const fs = require('fs');

console.log('==============================================');
console.log('VERIFICANDO BYPASS WA.ME');
console.log('==============================================');

const service = fs.readFileSync('src/modules/solicitudes-negocio/services/solicitudes-service.ts', 'utf8');

const hasWaMe = service.includes('wa.me');
const hasApiSend = service.includes('api.whatsapp.com/send/?phone=');

console.log(`[VERIFICACIÓN] ¿Contiene el destructivo wa.me? ${hasWaMe ? 'SÍ (ERROR)' : 'NO (CORRECTO)'}`);
console.log(`[VERIFICACIÓN] ¿Usa la conexión directa segura? ${hasApiSend ? 'SÍ (CORRECTO)' : 'NO (ERROR)'}`);

if (!hasWaMe && hasApiSend) {
  console.log('\n>>> RESULTADO: BYPASS APLICADO PERFECTAMENTE <<<');
}
console.log('==============================================');
