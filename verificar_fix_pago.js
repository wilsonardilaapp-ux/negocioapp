const fs = require('fs');

console.log('==============================================');
console.log('VERIFICANDO ESTADO DE PAGO');
console.log('==============================================');

const route = fs.readFileSync('src/app/api/solicitudes-negocio/admin/solicitudes/route.ts', 'utf8');
const inbox = fs.readFileSync('src/modules/solicitudes-negocio/components/admin-inbox.tsx', 'utf8');

console.log(`[API ROUTE] Recibe paymentStatus: ${route.includes('paymentStatus') ? 'SÍ' : 'NO'}`);
console.log(`[API ROUTE] Pasa paymentStatus a actualizarEstadoSolicitud: ${route.includes('actualizarEstadoSolicitud(id, status, paymentStatus') ? 'SÍ' : 'NO'}`);
console.log(`[INBOX] Selector deshabilitado al guardar (disabled={updating}): ${inbox.includes('disabled={updating}') ? 'SÍ' : 'NO'}`);
console.log(`[INBOX] Mensaje visual 'Guardando...': ${inbox.includes("setActionMessage('Guardando...')") ? 'SÍ' : 'NO'}`);

console.log('==============================================');
