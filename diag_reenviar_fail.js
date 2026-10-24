const fs = require('fs');

console.log('==============================================');
console.log('DIAGNÓSTICO: REENVIAR WHATSAPP (400 BAD REQUEST)');
console.log('==============================================');

const servicePath = 'src/modules/solicitudes-negocio/services/solicitudes-service.ts';
if (fs.existsSync(servicePath)) {
  const content = fs.readFileSync(servicePath, 'utf8');
  const startIdx = content.indexOf('export async function reenviarWhatsAppSolicitud');
  const endIdx = content.indexOf('export async function getSolicitudes');
  console.log('--- [1] CÓDIGO ACTUAL reenviarWhatsAppSolicitud ---');
  console.log(content.slice(startIdx, endIdx));
}

const routePath = 'src/app/api/solicitudes-negocio/admin/reenviar-whatsapp/route.ts';
if (fs.existsSync(routePath)) {
  console.log('\n--- [2] CÓDIGO API reenviar-whatsapp/route.ts ---');
  console.log(fs.readFileSync(routePath, 'utf8'));
}

console.log('==============================================');
