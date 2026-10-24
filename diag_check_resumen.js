const fs = require('fs');
const content = fs.readFileSync('src/modules/solicitudes-negocio/services/solicitudes-service.ts', 'utf8');
const start = content.indexOf('const resumenMensajeWa');
console.log(content.slice(start, start + 600));
