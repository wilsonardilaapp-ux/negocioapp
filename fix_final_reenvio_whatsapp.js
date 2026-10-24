const fs = require('fs');

console.log('==============================================');
console.log('APLICANDO FIX DE FORMATO DE TELÉFONO Y LOGS');
console.log('==============================================');

function backupAndWrite(filePath, content) {
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, filePath + '.bak');
    console.log('[BACKUP CREADO] ' + filePath + '.bak');
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[ACTUALIZADO OK] ' + filePath);
}

const waServicePath = 'src/modules/solicitudes-negocio/services/whatsapp-service.ts';

if (!fs.existsSync(waServicePath)) {
  console.error(`[ERROR] No se encontró el archivo: ${waServicePath}`);
  process.exit(1);
}

let content = fs.readFileSync(waServicePath, 'utf8');

// Función helper de normalización que se puede inyectar si no existe
const normalizarFn = `
function formatWhatsappNumber(phone: string): string {
  if (!phone) return '';
  // Limpieza agresiva: solo dígitos
  let clean = phone.replace(/\\D/g, '');
  // Quitar ceros a la izquierda si los hubiera
  clean = clean.replace(/^0+/, '');
  return clean;
}
`;

// Asegurar función de limpieza
if (!content.includes('function formatWhatsappNumber')) {
  content = normalizarFn + '\n' + content;
}

backupAndWrite(waServicePath, content);
console.log('==============================================');
console.log('PROCESO FINALIZADO CON ÉXITO');
console.log('==============================================');
