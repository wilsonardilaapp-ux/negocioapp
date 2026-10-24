const fs = require('fs');

console.log('==============================================');
console.log('APLICANDO FIX DEFINITIVO: String.fromCodePoint');
console.log('==============================================');

function backupAndWrite(filePath, content) {
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, filePath + '.bak');
    console.log('[BACKUP OK] ' + filePath + '.bak');
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[ACTUALIZADO OK] ' + filePath);
}

// 1. constants.ts -> Usar helper con String.fromCodePoint
const constPath = 'src/modules/solicitudes-negocio/constants.ts';
let constCode = fs.readFileSync(constPath, 'utf8');

const newConstTemplate = `whatsappMessageTemplate: String.fromCodePoint(0x1F195) + ' *Nueva Solicitud de Negocio - Markix*\\n\\n' +
    String.fromCodePoint(0x1F3EA) + ' *Negocio:* {nombre}\\n' +
    String.fromCodePoint(0x1F4DE) + ' *Teléfono:* {telefono}\\n' +
    String.fromCodePoint(0x1F3F7, 0xFE0F) + ' *Categoría:* {categoria}\\n' +
    String.fromCodePoint(0x1F4E6) + ' *Plan:* {plan} ({valor})\\n' +
    '💳 *Pago:* {metodo_pago}\\n' +
    String.fromCodePoint(0x1F9FE) + ' *Comprobante:* {comprobante}\\n' +
    String.fromCodePoint(0x1F3A8) + ' *Creación de imágenes:* {imagenes}\\n\\n' +
    String.fromCodePoint(0x1F517) + ' *Enlace al panel:*\\n{enlace}',`;

const regexTemplate = /whatsappMessageTemplate:\s*['`][\s\S]*?['`],/;
if (regexTemplate.test(constCode)) {
  constCode = constCode.replace(regexTemplate, newConstTemplate);
  backupAndWrite(constPath, constCode);
}

// 2. solicitudes-service.ts -> Usar String.fromCodePoint en resumenMensajeWa
const servicePath = 'src/modules/solicitudes-negocio/services/solicitudes-service.ts';
let serviceCode = fs.readFileSync(servicePath, 'utf8');

const newServiceWaBlock = `  const resumenMensajeWa = [
    String.fromCodePoint(0x1F195) + ' *Nueva Solicitud de Negocio - Markix*',
    '',
    String.fromCodePoint(0x1F3EA) + ' *Negocio:* ' + data.businessName,
    String.fromCodePoint(0x1F4DE) + ' *Teléfono:* ' + data.phone,
    String.fromCodePoint(0x1F4CD) + ' *Dirección:* ' + data.address,
    String.fromCodePoint(0x1F3F7, 0xFE0F) + ' *Categoría:* ' + data.category,
    String.fromCodePoint(0x1F4E6) + ' *Plan:* ' + planName + ' (' + valorStr + ')',
    '💳 *Pago:* ' + paymentMethod,
    data.paymentReference ? String.fromCodePoint(0x1F522) + ' *Ref Pago:* ' + data.paymentReference : null,
    data.paymentReceiptUrl ? String.fromCodePoint(0x1F9FE) + ' *Comprobante:* ' + data.paymentReceiptUrl : null,
    String.fromCodePoint(0x1F3A8) + ' *Creación imágenes:* ' + imagenesStr,
    '',
    String.fromCodePoint(0x1F517) + ' *Enlace al Panel:*',
    panelLink
  ].filter(Boolean).join('\\n');

  const resumenArray = Array.from(resumenMensajeWa);
  const mensajeFinalWa = resumenArray.length > 1500 
    ? resumenArray.slice(0, 1450).join('') + '\\n\\n' + String.fromCodePoint(0x1F517) + ' ' + panelLink 
    : resumenMensajeWa;

  const whatsappUrl = 'https://wa.me/' + targetPhone + '?text=' + encodeURIComponent(mensajeFinalWa);`;

if (serviceCode.includes('resumenMensajeWa')) {
  const startIdx = serviceCode.indexOf('const resumenMensajeWa = [');
  const endIdx = serviceCode.indexOf('const whatsappUrl =');
  const nextSemicolon = serviceCode.indexOf(';', endIdx);
  if (startIdx !== -1 && nextSemicolon !== -1) {
    serviceCode = serviceCode.slice(0, startIdx) + newServiceWaBlock + serviceCode.slice(nextSemicolon + 1);
    backupAndWrite(servicePath, serviceCode);
  }
}

// Actualizar también en reenviarWhatsAppSolicitud si usa resumenMensajeWa o plantilla
if (serviceCode.includes('reenviarWhatsAppSolicitud')) {
  // Ya lee de DEFAULT_SOLICITUD_CONFIG o whatsappMessageTemplate que acabamos de actualizar
}

console.log('==============================================');
console.log('FIX DE CODEPOINT APLICADO CON ÉXITO');
console.log('==============================================');
