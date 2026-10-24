const fs = require('fs');

console.log('==============================================');
console.log('APLICANDO CORRECCIÓN: EMOJIS UNICODE EN WHATSAPP');
console.log('==============================================');

function backupAndWrite(filePath, content) {
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, filePath + '.bak');
    console.log('[BACKUP OK] ' + filePath + '.bak');
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[ACTUALIZADO OK] ' + filePath);
}

// 1. constants.ts -> Actualizar plantilla por defecto con secuencias Unicode
const constPath = 'src/modules/solicitudes-negocio/constants.ts';
let constCode = fs.readFileSync(constPath, 'utf8');

const newTemplate = `whatsappMessageTemplate: '\\u{1F195} *Nueva Solicitud de Negocio - Markix*\\n\\n' +
    '\\u{1F3EA} *Negocio:* {nombre}\\n' +
    '\\u{1F4DE} *Teléfono:* {telefono}\\n' +
    '\\u{1F3F7}\\u{FE0F} *Categoría:* {categoria}\\n' +
    '\\u{1F4E6} *Plan:* {plan} ({valor})\\n' +
    '\\u{1F4B3} *Pago:* {metodo_pago}\\n' +
    '\\u{1F9FE} *Comprobante:* {comprobante}\\n' +
    '\\u{1F3A8} *Creación de imágenes:* {imagenes}\\n\\n' +
    '\\u{1F517} *Enlace al panel:*\\n{enlace}',`;

const regexTemplate = /whatsappMessageTemplate:\s*['`][\s\S]*?['`],/;
if (regexTemplate.test(constCode)) {
  constCode = constCode.replace(regexTemplate, newTemplate);
  backupAndWrite(constPath, constCode);
}

// 2. solicitudes-service.ts -> Actualizar resumenMensajeWa con Unicode y Array.from
const servicePath = 'src/modules/solicitudes-negocio/services/solicitudes-service.ts';
let serviceCode = fs.readFileSync(servicePath, 'utf8');

const newWaBlock = `  const resumenMensajeWa = [
    '\\u{1F195} *Nueva Solicitud de Negocio - Markix*',
    '',
    '\\u{1F3EA} *Negocio:* ' + data.businessName,
    '\\u{1F4DE} *Teléfono:* ' + data.phone,
    '\\u{1F4CD} *Dirección:* ' + data.address,
    '\\u{1F3F7}\\u{FE0F} *Categoría:* ' + data.category,
    '\\u{1F4E6} *Plan:* ' + planName + ' (' + valorStr + ')',
    '\\u{1F4B3} *Pago:* ' + paymentMethod,
    data.paymentReference ? '\\u{1F522} *Ref Pago:* ' + data.paymentReference : null,
    data.paymentReceiptUrl ? '\\u{1F9FE} *Comprobante:* ' + data.paymentReceiptUrl : null,
    '\\u{1F3A8} *Creación imágenes:* ' + imagenesStr,
    '',
    '\\u{1F517} *Enlace al Panel:*',
    panelLink
  ].filter(Boolean).join('\\n');

  // Limitar longitud de forma segura con Array.from por caracteres unicode completos
  const resumenArray = Array.from(resumenMensajeWa);
  const mensajeFinalWa = resumenArray.length > 1500 
    ? resumenArray.slice(0, 1450).join('') + '\\n\\n\\u{1F517} ' + panelLink 
    : resumenMensajeWa;

  const whatsappUrl = 'https://wa.me/' + targetPhone + '?text=' + encodeURIComponent(mensajeFinalWa);`;

if (serviceCode.includes('resumenMensajeWa')) {
  const startIdx = serviceCode.indexOf('const resumenMensajeWa = [');
  const endIdx = serviceCode.indexOf('const whatsappUrl =');
  const nextSemicolon = serviceCode.indexOf(';', endIdx);
  if (startIdx !== -1 && nextSemicolon !== -1) {
    serviceCode = serviceCode.slice(0, startIdx) + newWaBlock + serviceCode.slice(nextSemicolon + 1);
    backupAndWrite(servicePath, serviceCode);
  }
}

console.log('==============================================');
console.log('CORRECCIÓN DE EMOJIS APLICADA CON ÉXITO');
console.log('==============================================');
