const fs = require('fs');

console.log('==============================================');
console.log('APLICANDO CORRECCIÓN DIRECTA AL ARRAY DE WHATSAPP');
console.log('==============================================');

function backupAndWrite(filePath, content) {
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, filePath + '.bak');
    console.log('[BACKUP OK] ' + filePath + '.bak');
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[ACTUALIZADO OK] ' + filePath);
}

const servicePath = 'src/modules/solicitudes-negocio/services/solicitudes-service.ts';
let content = fs.readFileSync(servicePath, 'utf8');

const businessLine = "String.fromCodePoint(0x1F3EA) + ' *Negocio:* ' + data.businessName,";
const nameLine = "    String.fromCodePoint(0x1F464) + ' *Nombre completo:* ' + (data.fullName || 'No registrado'),";

// Actualizar crearSolicitud
if (content.includes(businessLine) && !content.includes(nameLine)) {
  content = content.replace(businessLine, businessLine + '\n    ' + nameLine);
}

// Actualizar reenviarWhatsAppSolicitud (que usa 'solicitud.' en lugar de 'data.')
const businessLineReenviar = "String.fromCodePoint(0x1F3EA) + ' *Negocio:* ' + solicitud.businessName,";
const nameLineReenviar = "    String.fromCodePoint(0x1F464) + ' *Nombre completo:* ' + (solicitud.fullName || 'No registrado'),";

if (content.includes(businessLineReenviar) && !content.includes(nameLineReenviar)) {
  content = content.replace(businessLineReenviar, businessLineReenviar + '\n    ' + nameLineReenviar);
}

backupAndWrite(servicePath, content);

console.log('==============================================');
console.log('FIX DE ARRAY WHATSAPP APLICADO CON ÉXITO');
console.log('==============================================');
