const fs = require('fs');

console.log('==============================================');
console.log('DIAGNÓSTICO: ESTADO DE PAGO EN BANDEJA');
console.log('==============================================');

// 1. Revisar admin-inbox.tsx (selector y etiquetas)
const inboxPath = 'src/modules/solicitudes-negocio/components/admin-inbox.tsx';
if (fs.existsSync(inboxPath)) {
  const content = fs.readFileSync(inboxPath, 'utf8');
  console.log('\n--- [1] SELECTOR Y BADGES EN admin-inbox.tsx ---');
  content.split('\n').forEach((l, i) => {
    if (l.includes('paymentStatus') || l.includes('Gracias por') || l.includes('Pagado') || l.includes('handleCambiarEstado')) {
      console.log(`L${i + 1}: ${l.trim()}`);
    }
  });
}

// 2. Revisar solicitudes-service.ts (actualizarEstadoSolicitud)
const servicePath = 'src/modules/solicitudes-negocio/services/solicitudes-service.ts';
if (fs.existsSync(servicePath)) {
  const content = fs.readFileSync(servicePath, 'utf8');
  console.log('\n--- [2] actualizarEstadoSolicitud EN solicitudes-service.ts ---');
  const startIdx = content.indexOf('export async function actualizarEstadoSolicitud');
  if (startIdx !== -1) {
    console.log(content.slice(startIdx, startIdx + 500));
  }
}

// 3. Revisar API PATCH en src/app/api/solicitudes-negocio/admin/solicitudes/route.ts
const routePath = 'src/app/api/solicitudes-negocio/admin/solicitudes/route.ts';
if (fs.existsSync(routePath)) {
  const content = fs.readFileSync(routePath, 'utf8');
  console.log('\n--- [3] ENDPOINT PATCH EN route.ts ---');
  console.log(content);
}

console.log('==============================================');
