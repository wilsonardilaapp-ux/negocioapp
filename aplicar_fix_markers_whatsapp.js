const fs = require('fs');

console.log('==============================================');
console.log('APLICANDO FIX CON MARCADORES EMOJI Y SANITIZACIÓN');
console.log('==============================================');

function backupAndWrite(filePath, content) {
  if (fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, filePath + '.bak');
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('[ACTUALIZADO OK] ' + filePath);
}

// 1. constants.ts -> Plantilla con marcadores {e_...}
const constPath = 'src/modules/solicitudes-negocio/constants.ts';
let constCode = fs.readFileSync(constPath, 'utf8');

const newConstTemplate = `whatsappMessageTemplate: '{e_nuevo} *Nueva Solicitud de Negocio - Markix*\\n\\n' +
    '{e_negocio} *Negocio:* {nombre}\\n' +
    '{e_telefono} *Teléfono:* {telefono}\\n' +
    '{e_direccion} *Dirección:* {direccion}\\n' +
    '{e_categoria} *Categoría:* {categoria}\\n' +
    '{e_plan} *Plan:* {plan} ({valor})\\n' +
    '{e_pago} *Pago:* {metodo_pago}\\n' +
    '{e_comprobante} *Comprobante:* {comprobante}\\n' +
    '{e_imagenes} *Creación de imágenes:* {imagenes}\\n\\n' +
    '{e_enlace} *Enlace al panel:*\\n{enlace}',`;

const regexTemplate = /whatsappMessageTemplate:\s*['`][\s\S]*?['`],/;
if (regexTemplate.test(constCode)) {
  constCode = constCode.replace(regexTemplate, newConstTemplate);
  backupAndWrite(constPath, constCode);
}

// 2. solicitudes-service.ts -> Reemplazo dinámico de marcadores y limpieza de U+FFFD
const servicePath = 'src/modules/solicitudes-negocio/services/solicitudes-service.ts';
let serviceCode = fs.readFileSync(servicePath, 'utf8');

const helperReplacer = `
function renderizarPlantillaWhatsApp(plantillaRaw: string, vars: {
  nombre: string;
  telefono: string;
  direccion: string;
  categoria: string;
  plan: string;
  valor: string;
  metodo_pago: string;
  comprobante: string;
  imagenes: string;
  enlace: string;
}): string {
  // 1. Sanitizar eliminando cualquier caracter U+FFFD () corrupto
  let limpia = (plantillaRaw || '').replace(/\\uFFFD/g, '').replace(//g, '');

  // 2. Reemplazar marcadores de emojis usando String.fromCodePoint de forma segura
  limpia = limpia.replace(/{e_nuevo}/g, String.fromCodePoint(0x1F195));
  limpia = limpia.replace(/{e_negocio}/g, String.fromCodePoint(0x1F3EA));
  limpia = limpia.replace(/{e_telefono}/g, String.fromCodePoint(0x1F4DE));
  limpia = limpia.replace(/{e_direccion}/g, String.fromCodePoint(0x1F4CD));
  limpia = limpia.replace(/{e_categoria}/g, String.fromCodePoint(0x1F3F7));
  limpia = limpia.replace(/{e_plan}/g, String.fromCodePoint(0x1F4E6));
  limpia = limpia.replace(/{e_pago}/g, String.fromCodePoint(0x1F4B3));
  limpia = limpia.replace(/{e_comprobante}/g, String.fromCodePoint(0x1F9FE));
  limpia = limpia.replace(/{e_imagenes}/g, String.fromCodePoint(0x1F3A8));
  limpia = limpia.replace(/{e_enlace}/g, String.fromCodePoint(0x1F517));

  // 3. Reemplazar variables de texto
  limpia = limpia.replace(/{nombre}/g, vars.nombre || 'N/A');
  limpia = limpia.replace(/{telefono}/g, vars.telefono || 'N/A');
  limpia = limpia.replace(/{direccion}/g, vars.direccion || 'N/A');
  limpia = limpia.replace(/{categoria}/g, vars.categoria || 'N/A');
  limpia = limpia.replace(/{plan}/g, vars.plan || 'N/A');
  limpia = limpia.replace(/{valor}/g, vars.valor || 'N/A');
  limpia = limpia.replace(/{metodo_pago}/g, vars.metodo_pago || 'N/A');
  limpia = limpia.replace(/{comprobante}/g, vars.comprobante || 'N/A');
  limpia = limpia.replace(/{imagenes}/g, vars.imagenes || 'Ninguna');
  limpia = limpia.replace(/{enlace}/g, vars.enlace || '');

  // 4. Truncado seguro con Array.from
  const arr = Array.from(limpia);
  if (arr.length > 1500) {
    return arr.slice(0, 1450).join('') + '\\n\\n' + String.fromCodePoint(0x1F517) + ' ' + vars.enlace;
  }
  return limpia;
}
`;

if (!serviceCode.includes('function renderizarPlantillaWhatsApp')) {
  serviceCode = helperReplacer + '\n\n' + serviceCode;
}

// Actualizar cómo se arma la plantilla en crearSolicitud y reenviarWhatsAppSolicitud
const oldWaBlockMatch = /let plantilla = config\.whatsappMessageTemplate[\s\S]*?whatsappUrl = ['"]https:\/\/wa\.me\/['"] \+ targetPhone \+ '\?text='\s*\+\s*encodeURIComponent\(.+?\);/;

const newWaBlockReplacement = `  const plantillaRaw = config.whatsappMessageTemplate || DEFAULT_SOLICITUD_CONFIG.whatsappMessageTemplate;
  const mensajeFinalWa = renderizarPlantillaWhatsApp(plantillaRaw, {
    nombre: data.businessName,
    telefono: data.phone,
    direccion: data.address,
    categoria: data.category,
    plan: planName,
    valor: valorStr,
    metodo_pago: paymentMethod,
    comprobante: data.paymentReceiptUrl ? 'Adjuntado' : 'No adjuntado',
    imagenes: imagenesStr,
    enlace: panelLink
  });

  const whatsappUrl = 'https://wa.me/' + targetPhone + '?text=' + encodeURIComponent(mensajeFinalWa);`;

if (serviceCode.includes('whatsappMessageTemplate')) {
  serviceCode = serviceCode.replace(oldWaBlockMatch, newWaBlockReplacement);
  backupAndWrite(servicePath, serviceCode);
}

console.log('==============================================');
console.log('FIX CON MARCADORES APLICADO CON ÉXITO');
console.log('==============================================');
