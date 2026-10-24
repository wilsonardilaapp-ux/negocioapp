const fs = require('fs');

console.log('--- BUSCANDO MODELOS DE PLANES ---');
['src/models/subscription-plan.ts', 'src/models/hybrid-plan.ts'].forEach(f => {
  if (fs.existsSync(f)) {
    console.log(`\nContenido de ${f}:`);
    console.log(fs.readFileSync(f, 'utf8').slice(0, 400));
  }
});

// Comprobar si hay planes guardados en solicitud_config actual
const serviceFile = 'src/modules/solicitudes-negocio/services/solicitudes-service.ts';
if (fs.existsSync(serviceFile)) {
  const content = fs.readFileSync(serviceFile, 'utf8');
  console.log('\n--- Búsqueda de planes en solicitudes-service.ts ---');
  console.log(content.split('\n').filter(l => l.includes('plan') || l.includes('Plan')).slice(0, 10).join('\n'));
}
