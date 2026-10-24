const fs = require('fs');

console.log('==============================================');
console.log('APLICANDO BYPASS DE WA.ME (CONEXIÓN DIRECTA A API)');
console.log('==============================================');

const servicePath = 'src/modules/solicitudes-negocio/services/solicitudes-service.ts';

if (!fs.existsSync(servicePath)) {
  console.error('[ERROR] No se encontró el archivo:', servicePath);
  process.exit(1);
}

// Respaldo de seguridad
fs.copyFileSync(servicePath, servicePath + '.bak');

let content = fs.readFileSync(servicePath, 'utf8');

// Reemplazo exacto de la URL
const oldUrlString = "'https://wa.me/' + targetPhone + '?text='";
const newUrlString = "'https://api.whatsapp.com/send/?phone=' + targetPhone + '&text='";

if (content.includes(oldUrlString)) {
  content = content.replace(oldUrlString, newUrlString);
  fs.writeFileSync(servicePath, content, 'utf8');
  console.log('[OK] URL de WhatsApp cambiada a API directa (Eliminada redirección destructiva).');
} else {
  console.log('[INFO] No se encontró la cadena exacta, intentando reemplazo general...');
  content = content.replace(/https:\/\/wa\.me\//g, 'https://api.whatsapp.com/send/?phone=');
  content = content.replace(/\?text=/g, '&text=');
  fs.writeFileSync(servicePath, content, 'utf8');
  console.log('[OK] Reemplazo general aplicado.');
}

console.log('==============================================');
console.log('REDIRECCIÓN CORREGIDA CON ÉXITO');
console.log('==============================================');
